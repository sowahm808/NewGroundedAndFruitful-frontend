import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
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

  it('attaches the current Firebase ID token to a relative /api/v1 request', async () => {
    const request = await intercept(
      { currentUser: { getIdToken: () => Promise.resolve('firebase-token') } } as unknown as Auth,
      '/api/v1/admin/teams',
    );
    expect(request.headers.get('Authorization')).toBe('Bearer firebase-token');
  });

  it('adds authorization without transforming FormData or setting its boundary', async () => {
    const body = new FormData();
    body.append('title', 'Quiz');
    let forwarded!: HttpRequest<unknown>;
    TestBed.configureTestingModule({
      providers: [
        { provide: FIREBASE_AUTH, useValue: { currentUser: { getIdToken: () => Promise.resolve('token') } } },
      ],
    });
    await TestBed.runInInjectionContext(() =>
      firstValueFrom(
        authenticationInterceptor(
          new HttpRequest('POST', `${environment.apiUrl}/admin/bible-content/imports`, body),
          (request) => {
            forwarded = request;
            return of(new HttpResponse());
          },
        ),
      ),
    );
    expect(forwarded.body).toBe(body);
    expect(forwarded.headers.get('Authorization')).toBe('Bearer token');
    expect(forwarded.headers.has('Content-Type')).toBeFalse();
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

  it('leaves 401 recovery to the authentication lifecycle coordinator', async () => {
    const getIdToken = jasmine.createSpy().and.callFake((force?: boolean) => Promise.resolve(force ? 'fresh' : 'old'));
    const authorizations: (string | null)[] = [];
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_AUTH, useValue: { currentUser: { getIdToken } } }],
    });
    await expectAsync(
      TestBed.runInInjectionContext(() =>
        firstValueFrom(
          authenticationInterceptor(new HttpRequest('GET', `${environment.apiUrl}/data`), (request) => {
            authorizations.push(request.headers.get('Authorization'));
            return authorizations.length === 1
              ? throwError(() => new HttpErrorResponse({ status: 401 }))
              : of(new HttpResponse());
          }),
        ),
      ),
    ).toBeRejected();
    expect(authorizations).toEqual(['Bearer old']);
    expect(getIdToken.calls.allArgs()).toEqual([[false]]);
  });

  it('does not refresh or retry a 403', async () => {
    const getIdToken = jasmine.createSpy().and.resolveTo('token');
    let attempts = 0;
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_AUTH, useValue: { currentUser: { getIdToken } } }],
    });
    await expectAsync(
      TestBed.runInInjectionContext(() =>
        firstValueFrom(
          authenticationInterceptor(new HttpRequest('GET', `${environment.apiUrl}/data`), () => {
            attempts++;
            return throwError(() => new HttpErrorResponse({ status: 403 }));
          }),
        ),
      ),
    ).toBeRejected();
    expect(attempts).toBe(1);
    expect(getIdToken).toHaveBeenCalledOnceWith(false);
  });
});
