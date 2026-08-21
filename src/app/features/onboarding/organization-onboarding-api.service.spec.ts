import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrganizationOnboardingApiService } from './organization-onboarding-api.service';

describe('OrganizationOnboardingApiService', () => {
  it('posts only the bootstrap DTO and the caller-owned idempotency key to the onboarding endpoint', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(OrganizationOnboardingApiService);
    const http = TestBed.inject(HttpTestingController);
    const body = { name: 'Grounded', slug: 'grounded', timezone: 'UTC' };

    api.bootstrap(body, 'logical-submission-key').subscribe();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/onboarding/organization'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(Object.keys(request.request.body)).toEqual(['name', 'slug', 'timezone']);
    expect(request.request.headers.get('Idempotency-Key')).toBe('logical-submission-key');
    request.flush({ data: { organizationId: 'org-1', tokenRefreshRequired: false } });
    http.verify();
  });
});
