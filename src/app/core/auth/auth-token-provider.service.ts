import { Injectable, inject } from '@angular/core';
import { User } from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase-auth.token';

/** Resolves identity at request time. No token or rejected token promise is retained. */
@Injectable({ providedIn: 'root' })
export class AuthTokenProvider {
  private readonly auth = inject(FIREBASE_AUTH);
  private epoch = 0;

  setEpoch(epoch: number): void {
    this.epoch = epoch;
  }

  invalidate(epoch: number): void {
    this.epoch = epoch;
  }

  async token(forceRefresh = false, expectedEpoch = this.epoch, expectedUser?: User): Promise<string | null> {
    const user = expectedUser ?? this.auth.currentUser;
    if (!user || expectedEpoch !== this.epoch || this.auth.currentUser?.uid !== user.uid) return null;
    const token = await user.getIdToken(forceRefresh);
    return expectedEpoch === this.epoch && this.auth.currentUser?.uid === user.uid ? token : null;
  }
}
