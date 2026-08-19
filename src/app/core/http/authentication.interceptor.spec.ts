import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { Auth } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { FIREBASE_AUTH } from '../auth/firebase-auth.token';
import { authenticationInterceptor } from './authentication.interceptor';

describe('authenticationInterceptor', () => {
  async function intercept(auth: Partial<Auth>, url: string): Promise<HttpRequest<unknown>> {
    let forwarded!: HttpRequest<unknown>;
    TestBed.configureTestingModule({ providers: [{ provide: FIREBASE_AUTH, useValue: auth }] });
    await TestBed.runInInjectionContext(() =>
      firstValueFrom(
        authenticationInterceptor(new HttpRequest('GET', url), (request) => {
          forwarded = request;
          return of(new HttpResponse());
        }),
      ),
    );
    return forwarded;
  }

  it('attaches the current Firebase ID token to the configured API', async () => {
    const request = await intercept(
      { currentUser: { getIdToken: () => Promise.resolve('firebase-token') } } as unknown as Auth,
      `${environment.apiUrl}/auth/session`,
    );
    expect(request.headers.get('Authorization')).toBe('Bearer firebase-token');
  });

  it('does not acquire or attach a token for an unrelated origin', async () => {
    const getIdToken = jasmine.createSpy().and.resolveTo('firebase-token');
    const request = await intercept({ currentUser: { getIdToken } } as unknown as Auth, 'https://example.invalid/data');
    expect(getIdToken).not.toHaveBeenCalled();
    expect(request.headers.has('Authorization')).toBeFalse();
  });

  it('forwards an API request without a header when Firebase has no current user', async () => {
    const request = await intercept({ currentUser: null }, `${environment.apiUrl}/auth/session`);
    expect(request.headers.has('Authorization')).toBeFalse();
  });

  it('propagates token acquisition failures without making the HTTP request', async () => {
    const failure = new Error('token unavailable');
    let forwarded = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FIREBASE_AUTH,
          useValue: { currentUser: { getIdToken: () => Promise.reject(failure) } },
        },
      ],
    });
    await expectAsync(
      TestBed.runInInjectionContext(() =>
        firstValueFrom(
          authenticationInterceptor(new HttpRequest('GET', `${environment.apiUrl}/auth/session`), () => {
            forwarded = true;
            return of(new HttpResponse());
          }),
        ),
      ),
    ).toBeRejectedWith(failure);
    expect(forwarded).toBeFalse();
  });
});
