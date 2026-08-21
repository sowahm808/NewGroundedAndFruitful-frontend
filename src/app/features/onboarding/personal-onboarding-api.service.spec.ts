import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PersonalOnboardingApiService } from './personal-onboarding-api.service';

describe('PersonalOnboardingApiService', () => {
  it('issues the verified bootstrap POST with timezone and idempotency key', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(PersonalOnboardingApiService);
    const http = TestBed.inject(HttpTestingController);

    api.bootstrap({ timezone: 'Europe/London' }, 'personal-logical-key').subscribe();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/onboarding/personal'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ timezone: 'Europe/London' });
    expect(request.request.headers.get('Idempotency-Key')).toBe('personal-logical-key');
    request.flush({ data: { tokenRefreshRequired: false } });
    http.verify();
  });
});
