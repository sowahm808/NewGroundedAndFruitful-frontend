import { Inject, Injectable, computed, signal } from '@angular/core';
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
import { SessionUser, UserRole } from '../models/domain.models';

const validRoles: readonly UserRole[] = ['child', 'parent', 'mentor', 'observer', 'admin', 'super_admin'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly current = signal<SessionUser | null>(null);
  readonly user = this.current.asReadonly();
  readonly authenticated = computed(() => this.current() !== null && !this.current()?.disabled);
  readonly roles = computed(() => this.current()?.roles ?? []);

  constructor(@Inject(FIREBASE_AUTH) private readonly firebaseAuth: import('firebase/auth').Auth) {}

  /** Wait for Firebase to restore its persisted session before the router evaluates guards. */
  initialize(): Promise<void> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.firebaseAuth, async (user) => {
        await this.restoreFirebaseUser(user);
        unsubscribe();
        resolve();
      });
    });
  }

  async signIn(email: string, password: string): Promise<SessionUser> {
    const credential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    return (await this.restoreFirebaseUser(credential.user))!;
  }

  async createAccount(displayName: string, email: string, password: string): Promise<SessionUser> {
    const credential = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
    await updateProfile(credential.user, { displayName });
    return (await this.restoreFirebaseUser(credential.user, displayName))!;
  }

  async signInWithGoogle(): Promise<SessionUser> {
    const credential = await signInWithPopup(this.firebaseAuth, new GoogleAuthProvider());
    return (await this.restoreFirebaseUser(credential.user))!;
  }

  /** Applies an already-verified session, primarily for backend adapters and isolated tests. */
  restore(user: SessionUser | null): void {
    this.current.set(user);
  }

  hasRole(allowed: readonly UserRole[]): boolean {
    return this.roles().some((role) => allowed.includes(role));
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
    this.current.set(null);
  }

  private async restoreFirebaseUser(user: User | null, displayName?: string): Promise<SessionUser | null> {
    if (!user) {
      this.current.set(null);
      return null;
    }
    const claims = (await user.getIdTokenResult()).claims;
    const session: SessionUser = {
      uid: user.uid,
      displayName: displayName ?? user.displayName ?? user.email ?? 'Account',
      roles: extractRoles(claims),
      disabled: false,
    };
    this.current.set(session);
    return session;
  }
}

export function extractRoles(claims: Record<string, unknown>): readonly UserRole[] {
  const roleClaim = claims['role'];
  const rolesClaim = claims['roles'];
  const candidates = [
    ...(Array.isArray(rolesClaim) ? rolesClaim : typeof rolesClaim === 'string' ? rolesClaim.split(/[\s,]+/) : []),
    ...(typeof roleClaim === 'string' ? [roleClaim] : []),
    ...validRoles.filter((role) => claims[role] === true),
    ...(isRoleMap(rolesClaim) ? validRoles.filter((role) => rolesClaim[role] === true) : []),
  ];
  return validRoles.filter((role) => candidates.includes(role));
}

function isRoleMap(value: unknown): value is Partial<Record<UserRole, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
