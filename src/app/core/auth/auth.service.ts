import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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

export type AuthStatus =
  | 'initializing'
  | 'anonymous'
  | 'loading-session'
  | 'authenticated'
  | 'organization-required'
  | 'role-required'
  | 'pending-approval'
  | 'disabled'
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

  readonly status = this.currentStatus.asReadonly();
  readonly user = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && this.currentStatus() !== 'anonymous');
  readonly roles = computed(() => this.current()?.roles ?? []);
  readonly platformRoles = computed(() => this.current()?.platformRoles ?? []);
  readonly sessionReady = computed(() => !['initializing', 'loading-session'].includes(this.currentStatus()));
  readonly sessionError = this.currentError.asReadonly();
  readonly sessionSynchronizationWarning = this.synchronizationWarning.asReadonly();

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = new Promise((resolve) => {
      let initialEvent = true;
      onAuthStateChanged(this.firebaseAuth, (user) => {
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
    const credential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    return this.loadBackendSession(credential.user);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebaseAuth, email);
  }

  async signInChild(customToken: string): Promise<SessionUser> {
    const credential = await signInWithCustomToken(this.firebaseAuth, customToken);
    return this.loadBackendSession(credential.user);
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
      const credential = await signInWithPopup(this.firebaseAuth, new GoogleAuthProvider());
      user = credential.user;
      this.pendingRegistrationUser = user;
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
    this.bootstrapAttempt++;
    this.bootstrap = undefined;
    this.current.set(null);
    this.currentError.set(null);
    this.synchronizationWarning.set(null);
    this.synchronizationRefreshAttempted = false;
    this.currentStatus.set('anonymous');
    await signOut(this.firebaseAuth);
  }

  private async handleAuthChange(user: User | null): Promise<void> {
    if (!user) {
      this.bootstrapAttempt++;
      this.bootstrap = undefined;
      this.current.set(null);
      this.currentError.set(null);
      this.synchronizationWarning.set(null);
      this.currentStatus.set('anonymous');
      return;
    }
    try {
      await this.loadBackendSession(user);
    } catch {
      // The state and recoverable error are set by loadBackendSession.
    }
  }

  private loadBackendSession(firebaseUser: User): Promise<SessionUser> {
    if (this.bootstrap?.uid === firebaseUser.uid) return this.bootstrap.promise;
    const attempt = ++this.bootstrapAttempt;
    this.currentStatus.set('loading-session');
    this.currentError.set(null);
    this.synchronizationWarning.set(null);
    const promise = this.loadSession()
      .then((session) => {
        if (attempt === this.bootstrapAttempt) {
          this.current.set(session);
          this.applySessionStatus(session);
        }
        return session;
      })
      .catch((error: unknown) => {
        if (attempt === this.bootstrapAttempt) {
          this.current.set(null);
          this.currentStatus.set('error');
          this.currentError.set(
            'Your account was verified, but its application session could not be loaded. Try again.',
          );
          this.bootstrap = undefined;
        }
        throw classifySessionError(error);
      });
    this.bootstrap = { uid: firebaseUser.uid, promise };
    return promise;
  }

  private async loadSession(): Promise<SessionUser> {
    const response = await firstValueFrom(this.api.get<ApiResponse<SessionData>>('/auth/session'));
    let session = response.data;

    if (session.claimSynchronization.tokenRefreshRequired && !this.synchronizationRefreshAttempted) {
      this.synchronizationRefreshAttempted = true;
      await this.firebaseAuth.currentUser?.getIdToken(true);
      const refreshedResponse = await firstValueFrom(this.api.get<ApiResponse<SessionData>>('/auth/session'));
      session = refreshedResponse.data;
      if (session.claimSynchronization.tokenRefreshRequired) {
        this.synchronizationWarning.set(
          'Firebase claims remain pending synchronization; backend session roles are in use.',
        );
      } else {
        // A later refresh-required response represents a new synchronization event.
        this.synchronizationRefreshAttempted = false;
      }
    } else if (!session.claimSynchronization.tokenRefreshRequired) {
      this.synchronizationRefreshAttempted = false;
    }

    return {
      uid: session.uid,
      email: session.email,
      displayName: session.displayName,
      // Effective roles are calculated by the server. Never rebuild them from a selected membership.
      roles: normalizeRoles(session.effectiveRoles ?? session.roles),
      // Platform roles remain a separate authority dimension and are never inferred from memberships.
      platformRoles: normalizeRoles(session.platformRoles),
      disabled: session.disabled,
      onboardingStatus: session.onboardingStatus,
      ...(session.nextStep ? { nextStep: session.nextStep } : {}),
      ...(session.registrationIntent ? { registrationIntent: session.registrationIntent } : {}),
      memberships: session.memberships.map((membership) => ({
        ...membership,
        roles: normalizeRoles(membership.roles),
      })),
      ...(session.activeOrganizationId ? { activeOrganizationId: session.activeOrganizationId } : {}),
      ...(session.activeWorkspaceId ? { activeWorkspaceId: session.activeWorkspaceId } : {}),
      ...(session.activeWorkspace ? { activeWorkspace: session.activeWorkspace } : {}),
      ...(session.workspaces ? { workspaces: session.workspaces } : {}),
      ...(session.effectiveRoles ? { effectiveRoles: normalizeRoles(session.effectiveRoles) } : {}),
      ...(session.personalWorkspace ? { personalWorkspace: session.personalWorkspace } : {}),
      ...(session.elevation ? { elevation: session.elevation } : {}),
      ...(session.authorization ? { authorization: session.authorization } : {}),
    };
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
    else if (
      user.onboardingStatus === 'role_required' ||
      (user.onboardingStatus === 'complete' && user.roles.length === 0)
    )
      this.currentStatus.set('role-required');
    else this.currentStatus.set('authenticated');
  }
}

function classifySessionError(error: unknown): SessionBootstrapError {
  if (!(error instanceof ApiError)) return new SessionBootstrapError('unexpected');
  if (error.status === 0) return new SessionBootstrapError('network', error.requestId);
  if (error.status === 401) return new SessionBootstrapError('authentication', error.requestId);
  if (error.status === 403) return new SessionBootstrapError('forbidden', error.requestId);
  if (error.status === 404) return new SessionBootstrapError('not-found', error.requestId);
  if (error.status === 429) return new SessionBootstrapError('rate-limit', error.requestId);
  return new SessionBootstrapError(error.status >= 500 ? 'server' : 'unexpected', error.requestId);
}
