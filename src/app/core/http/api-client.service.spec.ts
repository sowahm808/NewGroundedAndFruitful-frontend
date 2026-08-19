import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiError } from './api-error';
import { ApiClient } from './api-client.service';

describe('ApiClient error mapping', () => {
  let api: ApiClient;
  let http: HttpTestingController;
  const url = `${environment.apiUrl.replace(/\/$/, '')}/test`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const [status, code] of [
    [404, 'resource_not_found'],
    [422, 'validation_error'],
    [500, 'server_error'],
  ] as const) {
    it(`maps HTTP ${status} accurately`, () => {
      let failure: unknown;
      api.get('/test').subscribe({ error: (error) => (failure = error) });
      http.expectOne(url).flush({}, { status, statusText: 'Failure' });
      expect(failure).toEqual(jasmine.objectContaining({ status, code }));
    });
  }

  it('maps status 0 to a network failure', () => {
    let failure: ApiError | undefined;
    api.get('/test').subscribe({ error: (error: ApiError) => (failure = error) });
    http.expectOne(url).error(new ProgressEvent('network error'));
    expect(failure?.status).toBe(0);
    expect(failure?.code).toBe('network_error');
  });
});
