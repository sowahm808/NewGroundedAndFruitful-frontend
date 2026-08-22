import { TestBed } from '@angular/core/testing';
import { AuthTokenProvider } from './auth-token-provider.service';
import { FIREBASE_AUTH } from './firebase-auth.token';

describe('AuthTokenProvider', () => {
  it('never reuses the first user or emits null/undefined bearer values across generations', async () => {
    const first = { uid: 'first', getIdToken: jasmine.createSpy().and.resolveTo('first-token') };
    const second = { uid: 'second', getIdToken: jasmine.createSpy().and.resolveTo('second-token') };
    const firebase = { currentUser: first };
    TestBed.configureTestingModule({ providers: [{ provide: FIREBASE_AUTH, useValue: firebase }] });
    const provider = TestBed.inject(AuthTokenProvider);

    provider.setEpoch(1);
    expect(await provider.token(false, 1, first as never)).toBe('first-token');
    provider.invalidate(2);
    firebase.currentUser = second;

    expect(await provider.token(false, 1, first as never)).toBeNull();
    expect(await provider.token(false, 2, second as never)).toBe('second-token');
    expect(first.getIdToken).toHaveBeenCalledTimes(1);
  });

  it('does not acquire a token while Firebase is signed out', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: FIREBASE_AUTH, useValue: { currentUser: null } }] });
    expect(await TestBed.inject(AuthTokenProvider).token()).toBeNull();
  });
});
