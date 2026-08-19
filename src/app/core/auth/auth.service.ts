import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase-auth.token';
import { MembershipState, SessionUser, UserRole } from '../models/domain.models';
import { ApiClient } from '../http/api-client.service';
import { ApiError } from '../http/api-error';
import { normalizeRoles } from './role.utilities';

export type AuthStatus =
  | 'initializing'
  | 'anonymous'
  | 'loading-session'
  | 'authenticated'
  | 'role-required'
  | 'pending-approval'
  | 'disabled'
  | 'error';

export interface BackendSessionResponse {
  readonly uid: string;
  readonly displayName: string | null;
  readonly roles: unknown;
  readonly disabled: boolean;
  readonly membershipState: MembershipState;
}

export class SessionBootstrapError extends Error {
  constructor(readonly kind: 'network' | 'forbidden' | 'server' | 'unexpected') {
    super('The application session could not be loaded.');
    this.name = 'SessionBootstrapError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseAuth = inject(FIREBASE_AUTH);
  private readonly api = inject(ApiClient);
  private readonly current = signal<SessionUser | null>(null);
  private readonly currentStatus = signal<AuthStatus>('initializing');
  private readonly currentError = signal<string | null>(null);
  private initialization?: Promise<void>;
  private bootstrap?: { uid: string; promise: Promise<SessionUser> };

  readonly status = this.currentStatus.asReadonly();
  readonly user = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && this.currentStatus() !== 'anonymous');
  readonly roles = computed(() => this.current()?.roles ?? []);
  readonly sessionReady = computed(() => !['initializing', 'loading-session'].includes(this.currentStatus()));
  readonly sessionError = this.currentError.asReadonly();

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

  async createAccount(displayName: string, email: string, password: string): Promise<SessionUser> {
    const credential = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
    await updateProfile(credential.user, { displayName });
    return this.loadBackendSession(credential.user);
  }

  async signInWithGoogle(): Promise<SessionUser> {
    const credential = await signInWithPopup(this.firebaseAuth, new GoogleAuthProvider());
    return this.loadBackendSession(credential.user);
  }

  async retrySession(): Promise<SessionUser | null> {
    const user = this.firebaseAuth.currentUser;
    if (!user) return null;
    this.bootstrap = undefined;
    return this.loadBackendSession(user);
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
    await signOut(this.firebaseAuth);
    this.bootstrap = undefined;
    this.current.set(null);
    this.currentError.set(null);
    this.currentStatus.set('anonymous');
  }

  private async handleAuthChange(user: User | null): Promise<void> {
    if (!user) {
      this.current.set(null);
      this.currentError.set(null);
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
    this.currentStatus.set('loading-session');
    this.currentError.set(null);
    const promise = firstValueFrom(this.api.get<BackendSessionResponse>('/auth/session'))
      .then((response) => {
        const session: SessionUser = {
          uid: response.uid,
          displayName: response.displayName?.trim() || firebaseUser.displayName || firebaseUser.email || 'Account',
          roles: normalizeRoles(response.roles),
          disabled: response.disabled,
          membershipState: response.membershipState,
        };
        this.current.set(session);
        this.applySessionStatus(session);
        return session;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          const session: SessionUser = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email || 'Account',
            roles: [],
            disabled: false,
            membershipState: 'active',
          };
          this.current.set(session);
          this.applySessionStatus(session);
          return session;
        }
        this.current.set(null);
        this.currentStatus.set('error');
        this.currentError.set('Your account was verified, but its application session could not be loaded. Try again.');
        this.bootstrap = undefined;
        throw classifySessionError(error);
      });
    this.bootstrap = { uid: firebaseUser.uid, promise };
    return promise;
  }

  private applySessionStatus(user: SessionUser | null): void {
    this.currentError.set(null);
    if (!user) this.currentStatus.set('anonymous');
    else if (user.disabled || user.membershipState === 'suspended' || user.membershipState === 'deleted')
      this.currentStatus.set('disabled');
    else if (user.membershipState === 'pending') this.currentStatus.set('pending-approval');
    else if (user.roles.length === 0) this.currentStatus.set('role-required');
    else this.currentStatus.set('authenticated');
  }
}

function classifySessionError(error: unknown): SessionBootstrapError {
  if (!(error instanceof ApiError)) return new SessionBootstrapError('unexpected');
  if (error.status === 0) return new SessionBootstrapError('network');
  if (error.status === 401 || error.status === 403) return new SessionBootstrapError('forbidden');
  return new SessionBootstrapError(error.status >= 500 ? 'server' : 'unexpected');
}
