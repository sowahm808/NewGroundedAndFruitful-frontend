import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { transientRetryInterceptor } from './transient-retry.interceptor';

describe('transientRetryInterceptor contract', () => {
  it('retries a transient GET no more than twice', fakeAsync(() => {
    let attempts = 0;
    let failure: unknown;
    TestBed.runInInjectionContext(() =>
      transientRetryInterceptor(new HttpRequest('GET', '/safe'), () => {
        attempts++;
        return throwError(() => new HttpErrorResponse({ status: 503 }));
      }).subscribe({ error: (error) => (failure = error) }),
    );
    tick(750);
    expect(attempts).toBe(3);
    expect(failure).toEqual(jasmine.objectContaining({ status: 503 }));
  }));

  it('never retries mutations or forbidden responses', async () => {
    for (const [method, status] of [['POST', 503], ['GET', 403]] as const) {
      let attempts = 0;
      await expectAsync(
        TestBed.runInInjectionContext(() =>
          firstValueFrom(
            transientRetryInterceptor(new HttpRequest(method, '/resource', null), () => {
              attempts++;
              return throwError(() => new HttpErrorResponse({ status }));
            }),
          ),
        ),
      ).toBeRejected();
      expect(attempts).toBe(1);
    }
  });

  it('honors Retry-After for a throttled GET', fakeAsync(() => {
    let attempts = 0;
    let completed = false;
    TestBed.runInInjectionContext(() =>
      transientRetryInterceptor(new HttpRequest('GET', '/safe'), () => {
        attempts++;
        return attempts === 1
          ? throwError(() =>
              new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '2' }) }),
            )
          : of(new HttpResponse({ status: 200 }));
      }).subscribe({ complete: () => (completed = true) }),
    );
    tick(1999);
    expect(attempts).toBe(1);
    tick(1);
    expect(attempts).toBe(2);
    expect(completed).toBeTrue();
  }));
});
