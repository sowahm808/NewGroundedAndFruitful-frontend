import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase-auth.token';
import {
  ApiResponse,
  RegistrationIntent,
  RegistrationIntentResponse,
  SessionData,
  SessionUser,
  UserRole,
} from '../models/domain.models';
import { ApiClient } from '../http/api-client.service';
import { ApiError } from '../http/api-error';
import { normalizeRoles } from './role.utilities';
import { AuthTokenProvider } from './auth-token-provider.service';

function normalizeStrings(values: readonly string[] | undefined): readonly string[] {
  return [...new Set((values ?? []).filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function normalizePersonas(values: SessionData['personas']): NonNullable<SessionData['personas']> {
  return normalizeStrings(values).filter(
    (value): value is NonNullable<SessionData['personas']>[number] =>
      value === 'child' || value === 'parent' || value === 'mentor' || value === 'observer',
  );
}

export type AuthStatus =
  | 'initializing'
  | 'anonymous'
  | 'signing-in'
  | 'signing-out'
  | 'loading-session'
  | 'authenticated'
  | 'organization-required'
  | 'role-required'
  | 'pending-approval'
  | 'disabled'
  | 'authentication-error'
  | 'error';

export class SessionBootstrapError extends Error {
  constructor(
    readonly kind: 'network' | 'authentication' | 'forbidden' | 'not-found' | 'rate-limit' | 'server' | 'unexpected',
    readonly requestId?: string,
  ) {
    super('The application session could not be loaded.');
    this.name = 'SessionBootstrapError';
  }
}

export interface RegistrationResult {
  readonly intentResult: RegistrationIntentResponse;
  readonly session: SessionUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseAuth = inject(FIREBASE_AUTH);
  private readonly api = inject(ApiClient);
  private readonly tokens = inject(AuthTokenProvider);
  private readonly router = inject(Router, { optional: true });
  private readonly current = signal<SessionUser | null>(null);
  private readonly currentStatus = signal<AuthStatus>('initializing');
  private readonly currentError = signal<string | null>(null);
  private readonly synchronizationWarning = signal<string | null>(null);
  private initialization?: Promise<void>;
  private bootstrap?: { uid: string; promise: Promise<SessionUser> };
  private bootstrapAttempt = 0;
  /** Prevents repeated forced refreshes while the backend reports the same pending synchronization state. */
  private synchronizationRefreshAttempted = false;
  private pendingRegistrationUser?: User;
  private registrationIntentSubmission?: { key: string; promise: Promise<RegistrationResult> };
  private authGeneration = 0;
  private readonly generationState = signal(0);
  private cancellation = new Subject<void>();
  private navigationId = 0;

  readonly status = this.currentStatus.asReadonly();
  readonly user = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && this.currentStatus() !== 'anonymous');
  readonly roles = computed(() => this.current()?.roles ?? []);
  readonly platformRoles = computed(() => this.current()?.platformRoles ?? []);
  readonly personas = computed(() => this.current()?.personas ?? []);
  readonly capabilities = computed(() => this.current()?.capabilities ?? []);
  readonly sessionReady = computed(() => !['initializing', 'loading-session'].includes(this.currentStatus()));
  readonly sessionError = this.currentError.asReadonly();
  readonly sessionSynchronizationWarning = this.synchronizationWarning.asReadonly();
  /** Changes whenever credentials are replaced or cleared; feature stores use it to invalidate scoped data. */
  readonly sessionGeneration = this.generationState.asReadonly();

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = new Promise((resolve) => {
      let initialEvent = true;
      onAuthStateChanged(this.firebaseAuth, (user) => {
        this.trace('firebase_auth_state', { hasUser: Boolean(user), uid: user ? safeUid(user.uid) : undefined });
        void this.handleAuthChange(user).finally(() => {
          if (initialEvent) {
            initialEvent = false;
            resolve();
          }
        });
      });
    });
    return this.initialization;
  }

  async signIn(email: string, password: string): Promise<SessionUser> {
    const generation = this.beginGeneration('signing-in');
    this.trace('firebase_login_start', { hasUser: false });
    const credential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    return this.finishSignIn(credential.user, generation);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebaseAuth, email);
  }

  async signInChild(customToken: string): Promise<SessionUser> {
    const generation = this.beginGeneration('signing-in');
    const credential = await signInWithCustomToken(this.firebaseAuth, customToken);
    return this.finishSignIn(credential.user, generation);
  }

  async createAccount(
    displayName: string,
    email: string,
    password: string,
    intent: RegistrationIntent,
  ): Promise<RegistrationResult> {
    let user = this.pendingRegistrationUser;
    if (!user || user.email?.toLowerCase() !== email.trim().toLowerCase()) {
      const credential = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
      user = credential.user;
      this.pendingRegistrationUser = user;
      await updateProfile(user, { displayName });
    }
    return this.completeRegistration(user, intent);
  }

  signInWithGoogle(): Promise<SessionUser>;
  signInWithGoogle(intent: RegistrationIntent): Promise<RegistrationResult>;
  async signInWithGoogle(intent?: RegistrationIntent): Promise<SessionUser | RegistrationResult> {
    let user = this.pendingRegistrationUser;
    if (!user) {
      const generation = this.beginGeneration('signing-in');
      const credential = await signInWithPopup(this.firebaseAuth, new GoogleAuthProvider());
      user = credential.user;
      this.pendingRegistrationUser = user;
      if (!intent) return this.finishSignIn(user, generation);
    }
    if (intent) return this.completeRegistration(user, intent);
    return this.loadBackendSession(user);
  }

  private async completeRegistration(user: User, intent: RegistrationIntent): Promise<RegistrationResult> {
    const key = `${user.uid}:${intent}`;
    if (this.registrationIntentSubmission?.key === key) return this.registrationIntentSubmission.promise;
    const promise = this.submitRegistrationIntent(user, intent);
    this.registrationIntentSubmission = { key, promise };
    try {
      return await promise;
    } catch (error) {
      this.registrationIntentSubmission = undefined;
      throw error;
    }
  }

  async completeRegistrationIntent(intent: RegistrationIntent): Promise<RegistrationResult> {
    const user = this.firebaseAuth.currentUser;
    if (!user) throw new Error('An authenticated Firebase user is required.');
    return this.completeRegistration(user, intent);
  }

  private async submitRegistrationIntent(user: User, intent: RegistrationIntent): Promise<RegistrationResult> {
    const authenticatedUser = await this.waitForAuthenticatedUser(user.uid);
    // Acquire a current token before constructing the request. The central interceptor remains
    // solely responsible for placing it in the Authorization header.
    await authenticatedUser.getIdToken(false);
    const intentResult = await this.recordRegistrationIntent(intent);
    const session = await this.reloadBackendSession(authenticatedUser);
    this.pendingRegistrationUser = undefined;
    return { intentResult, session };
  }

  private async waitForAuthenticatedUser(expectedUid: string): Promise<User> {
    await this.firebaseAuth.authStateReady();
    const currentUser = this.firebaseAuth.currentUser;
    if (!currentUser || currentUser.uid !== expectedUid)
      throw new Error('The newly created Firebase user is not active.');
    return currentUser;
  }

  private async recordRegistrationIntent(intent: RegistrationIntent): Promise<RegistrationIntentResponse> {
    // Identity has already been verified by Firebase. Roles/capabilities are deliberately absent.
    return firstValueFrom(
      this.api.postData<RegistrationIntentResponse>('/auth/registration-intent', { intent } satisfies {
        intent: RegistrationIntent;
      }),
    );
  }

  private reloadBackendSession(user: User): Promise<SessionUser> {
    this.bootstrap = undefined;
    return this.loadBackendSession(user);
  }

  async retrySession(): Promise<SessionUser | null> {
    const user = this.firebaseAuth.currentUser;
    if (!user) return null;
    this.bootstrap = undefined;
    return this.loadBackendSession(user);
  }

  /** Reloads the canonical backend session, optionally forcing a Firebase token first. */
  async refreshSession(forceToken = false): Promise<SessionUser | null> {
    if (forceToken) {
      // The caller has already honored the server's synchronization instruction. Mark
      // it before reloading so loadSession cannot force-refresh a second time.
      this.synchronizationRefreshAttempted = true;
      await this.firebaseAuth.currentUser?.getIdToken(true);
    }
    return this.retrySession();
  }

  async endElevation(): Promise<SessionUser | null> {
    await firstValueFrom(this.api.postData('/auth/elevation/end', {}));
    return this.refreshSession();
  }

  /** Applies an already backend-verified session in isolated tests. */
  restore(user: SessionUser | null): void {
    this.current.set(user);
    this.applySessionStatus(user);
  }

  hasRole(allowed: readonly UserRole[]): boolean {
    return this.roles().some((role) => allowed.includes(role));
  }

  async logout(): Promise<void> {
    if (this.currentStatus() === 'signing-out') return;
    this.currentStatus.set('signing-out');
    const generation = this.cancelGeneration();
    this.trace('logout_start', { hasUser: Boolean(this.firebaseAuth.currentUser) });
    this.clearApplicationAuthentication();
    await signOut(this.firebaseAuth);
    await this.firebaseAuth.authStateReady();
    if (this.firebaseAuth.currentUser) throw new Error('Firebase sign-out did not reach an authoritative null state.');
    this.trace('firebase_auth_state_confirmed', { hasUser: false });
    if (generation !== this.authGeneration) return;
    this.currentStatus.set('anonymous');
    this.trace('logout_complete', { hasUser: false });
    await this.navigate('/auth/login', true);
  }

  async navigate(route: string, replaceUrl = false): Promise<boolean> {
    const navigationId = ++this.navigationId;
    this.trace('navigation_start', { route, navigationId });
    if (!this.router) return false;
    const result = await this.router.navigateByUrl(route, { replaceUrl });
    this.trace('navigation_end', { route, navigationId, status: result ? 200 : 0 });
    return result;
  }

  private async handleAuthChange(user: User | null): Promise<void> {
    if (!user) {
      if (this.currentStatus() !== 'signing-out') {
        this.cancelGeneration();
        this.clearApplicationAuthentication();
        this.currentStatus.set('anonymous');
      }
      return;
    }
    if (this.currentStatus() === 'signing-in' || this.currentStatus() === 'signing-out') return;
    try {
      await this.loadBackendSession(user);
    } catch {
      // The state and recoverable error are set by loadBackendSession.
    }
  }

  private loadBackendSession(firebaseUser: User, generation = this.authGeneration): Promise<SessionUser> {
    if (this.bootstrap?.uid === firebaseUser.uid) return this.bootstrap.promise;
    const attempt = ++this.bootstrapAttempt;
    this.currentStatus.set('loading-session');
    this.currentError.set(null);
    this.synchronizationWarning.set(null);
    const promise = this.loadSession(firebaseUser, generation)
      .then((session) => {
        if (attempt === this.bootstrapAttempt && generation === this.authGeneration) {
          this.current.set(session);
          this.applySessionStatus(session);
        }
        return session;
      })
      .catch(async (error: unknown) => {
        const failure = classifySessionError(error);
        if (attempt === this.bootstrapAttempt && generation === this.authGeneration) {
          this.current.set(null);
          this.currentStatus.set(failure.kind === 'authentication' ? 'authentication-error' : 'error');
          this.currentError.set(
            'Your account was verified, but its application session could not be loaded. Try again.',
          );
          this.bootstrap = undefined;
          if (failure.kind === 'authentication') await this.logout();
        }
        throw failure;
      });
    this.bootstrap = { uid: firebaseUser.uid, promise };
    return promise;
  }

  private async loadSession(firebaseUser: User, generation: number): Promise<SessionUser> {
    this.assertCurrent(firebaseUser, generation);
    this.trace('session_request_start', { hasUser: true, uid: safeUid(firebaseUser.uid), route: '/auth/session' });
    let response: ApiResponse<SessionData> | SessionData;
    let refreshedAfterUnauthorized = false;
    try {
      response = await this.sessionRequest();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || generation !== this.authGeneration) throw error;
      this.trace('session_request_end', { status: 401, requestId: error.requestId, route: '/auth/session' });
      this.trace('token_acquisition_start', { hasUser: true, uid: safeUid(firebaseUser.uid) });
      const token = await this.tokens.token(true, generation, firebaseUser);
      if (!token) throw error;
      refreshedAfterUnauthorized = true;
      this.traceToken(firebaseUser, token);
      this.assertCurrent(firebaseUser, generation);
      response = await this.sessionRequest();
    }
    this.trace('session_request_end', { status: 200, route: '/auth/session' });
    let session = sessionBody(response);

    if (
      session.claimSynchronization?.tokenRefreshRequired &&
      !this.synchronizationRefreshAttempted &&
      !refreshedAfterUnauthorized
    ) {
      this.synchronizationRefreshAttempted = true;
      await this.tokens.token(true, generation, firebaseUser);
      const refreshedResponse = await this.sessionRequest();
      session = sessionBody(refreshedResponse);
      if (session.claimSynchronization?.tokenRefreshRequired) {
        this.synchronizationWarning.set(
          'Firebase claims remain pending synchronization; backend session roles are in use.',
        );
      } else {
        // A later refresh-required response represents a new synchronization event.
        this.synchronizationRefreshAttempted = false;
      }
    } else if (!session.claimSynchronization?.tokenRefreshRequired) {
      this.synchronizationRefreshAttempted = false;
    }

    return {
      uid: session.uid ?? firebaseUser.uid,
      email: session.email,
      displayName: session.displayName ?? firebaseUser.displayName ?? '',
      // Effective roles are calculated by the server. Never rebuild them from a selected membership.
      roles: normalizeRoles(session.effectiveRoles ?? session.roles),
      // Platform roles remain a separate authority dimension and are never inferred from memberships.
      platformRoles: normalizeRoles(session.platformRoles),
      ...(session.personas ? { personas: normalizePersonas(session.personas) } : {}),
      ...(session.capabilities ? { capabilities: normalizeStrings(session.capabilities) } : {}),
      ...(session.workspaceRoles ? { workspaceRoles: normalizeRoles(session.workspaceRoles) } : {}),
      disabled: session.disabled,
      onboardingStatus: session.onboardingStatus,
      ...(session.nextStep ? { nextStep: session.nextStep } : {}),
      ...(session.registrationIntent ? { registrationIntent: session.registrationIntent } : {}),
      ...(session.accountStateReason ? { accountStateReason: session.accountStateReason } : {}),
      ...(session.pendingInvitation === true ? { pendingInvitation: true } : {}),
      ...(session.supportReference ? { supportReference: session.supportReference } : {}),
      memberships: session.memberships.map((membership) => ({
        ...membership,
        roles: normalizeRoles(membership.roles),
        ...(membership.workspaceRoles ? { workspaceRoles: normalizeRoles(membership.workspaceRoles) } : {}),
        ...(membership.personas ? { personas: normalizePersonas(membership.personas) } : {}),
        ...(membership.capabilities ? { capabilities: normalizeStrings(membership.capabilities) } : {}),
      })),
      ...(session.activeOrganizationId ? { activeOrganizationId: session.activeOrganizationId } : {}),
      ...(session.activeWorkspaceId ? { activeWorkspaceId: session.activeWorkspaceId } : {}),
      ...(session.activeWorkspace
        ? { activeWorkspace: { ...session.activeWorkspace, roles: normalizeRoles(session.activeWorkspace.roles) } }
        : {}),
      ...(session.workspaces
        ? {
            workspaces: session.workspaces.map((workspace) => ({
              ...workspace,
              roles: normalizeRoles(workspace.roles),
            })),
          }
        : {}),
      ...(session.effectiveRoles ? { effectiveRoles: normalizeRoles(session.effectiveRoles) } : {}),
      ...(session.personalWorkspace ? { personalWorkspace: session.personalWorkspace } : {}),
      ...(session.elevation ? { elevation: session.elevation } : {}),
      ...(session.authorization ? { authorization: session.authorization } : {}),
    };
  }

  private async finishSignIn(user: User, generation: number): Promise<SessionUser> {
    this.assertCurrent(user, generation);
    this.trace('firebase_login_end', { hasUser: true, uid: safeUid(user.uid) });
    this.trace('token_acquisition_start', { hasUser: true, uid: safeUid(user.uid) });
    const token = await this.tokens.token(true, generation, user);
    if (!token) throw new SessionBootstrapError('authentication');
    this.traceToken(user, token);
    this.assertCurrent(user, generation);
    this.currentStatus.set('authenticated');
    return this.loadBackendSession(user, generation);
  }

  private beginGeneration(status: 'signing-in'): number {
    const generation = this.cancelGeneration();
    this.clearApplicationAuthentication();
    this.currentStatus.set(status);
    return generation;
  }

  private cancelGeneration(): number {
    this.cancellation.next();
    this.cancellation.complete();
    this.cancellation = new Subject<void>();
    this.bootstrapAttempt++;
    this.bootstrap = undefined;
    const generation = ++this.authGeneration;
    this.generationState.set(generation);
    this.tokens.invalidate(generation);
    return generation;
  }

  private clearApplicationAuthentication(): void {
    this.bootstrap = undefined;
    this.pendingRegistrationUser = undefined;
    this.registrationIntentSubmission = undefined;
    this.current.set(null);
    this.currentError.set(null);
    this.synchronizationWarning.set(null);
    this.synchronizationRefreshAttempted = false;
    this.trace('application_auth_cleared', { hasUser: Boolean(this.firebaseAuth.currentUser) });
  }

  private sessionRequest(): Promise<ApiResponse<SessionData> | SessionData> {
    return firstValueFrom(
      this.api.get<ApiResponse<SessionData> | SessionData>('/auth/session').pipe(takeUntil(this.cancellation)),
    );
  }

  private assertCurrent(user: User, generation: number): void {
    if (generation !== this.authGeneration || this.firebaseAuth.currentUser?.uid !== user.uid)
      throw new SessionBootstrapError('authentication');
  }

  private traceToken(user: User, token: string): void {
    const timing = tokenTiming(token);
    this.trace('token_acquisition_end', { hasUser: true, uid: safeUid(user.uid), ...timing });
  }

  private trace(stage: string, fields: Record<string, unknown>): void {
    // Structured diagnostics deliberately exclude credentials and personal account fields.
    console.info('[auth-lifecycle]', { stage, generation: this.authGeneration, ...fields });
  }

  private applySessionStatus(user: SessionUser | null): void {
    this.currentError.set(null);
    const membershipStates = user?.memberships.map((membership) => membership.status) ?? [];
    if (!user) this.currentStatus.set('anonymous');
    else if (user.disabled || membershipStates.includes('suspended')) this.currentStatus.set('disabled');
    else if (
      user.nextStep === 'organization_setup' ||
      user.onboardingStatus === 'organization_setup_required' ||
      user.onboardingStatus === 'organization_required' ||
      user.onboardingStatus === 'migration_required' ||
      (user.onboardingStatus === 'complete' &&
        !membershipStates.includes('active') &&
        user.authorization?.migrationRequired === true)
    )
      this.currentStatus.set('organization-required');
    else if (
      user.onboardingStatus === 'pending_approval' ||
      (membershipStates.includes('pending') && !membershipStates.includes('active'))
    )
      this.currentStatus.set('pending-approval');
    else if (user.onboardingStatus === 'role_required') this.currentStatus.set('role-required');
    else this.currentStatus.set('authenticated');
  }
}

function safeUid(uid: string): string {
  let hash = 2166136261;
  for (const character of uid) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `uid-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function tokenTiming(token: string): { issuedAt?: number; expiresAt?: number } {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { iat?: unknown; exp?: unknown };
    return {
      ...(typeof payload.iat === 'number' ? { issuedAt: payload.iat } : {}),
      ...(typeof payload.exp === 'number' ? { expiresAt: payload.exp } : {}),
    };
  } catch {
    return {};
  }
}

function sessionBody(response: ApiResponse<SessionData> | SessionData): SessionData {
  const candidate = 'data' in response ? response.data : response;
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    !Array.isArray(candidate.roles) ||
    !Array.isArray(candidate.memberships) ||
    typeof candidate.disabled !== 'boolean' ||
    typeof candidate.onboardingStatus !== 'string'
  )
    throw new SessionBootstrapError('unexpected');
  return candidate;
}

function classifySessionError(error: unknown): SessionBootstrapError {
  if (error instanceof SessionBootstrapError) return error;
  if (!(error instanceof ApiError)) return new SessionBootstrapError('unexpected');
  if (error.status === 0) return new SessionBootstrapError('network', error.requestId);
  if (error.status === 401) return new SessionBootstrapError('authentication', error.requestId);
  if (error.status === 403) return new SessionBootstrapError('forbidden', error.requestId);
  if (error.status === 404) return new SessionBootstrapError('not-found', error.requestId);
  if (error.status === 429) return new SessionBootstrapError('rate-limit', error.requestId);
  return new SessionBootstrapError(error.status >= 500 ? 'server' : 'unexpected', error.requestId);
}
