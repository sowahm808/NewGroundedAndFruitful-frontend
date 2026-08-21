import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  BootstrapContractError,
  OrganizationOnboardingApiService,
  normalizeBootstrapResponse,
} from './organization-onboarding-api.service';

describe('OrganizationOnboardingApiService', () => {
  it('posts only the bootstrap DTO and the caller-owned idempotency key to the onboarding endpoint', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(OrganizationOnboardingApiService);
    const http = TestBed.inject(HttpTestingController);
    const body = { name: 'Grounded', slug: 'grounded', timezone: 'UTC' };

    api.bootstrap(body, 'logical-submission-key').subscribe();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/onboarding/organization'));
    expect(request.request.url).not.toContain('/admin/organizations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(Object.keys(request.request.body)).toEqual(['name', 'slug', 'timezone']);
    expect(request.request.headers.get('Idempotency-Key')).toBe('logical-submission-key');
    request.flush({
      data: {
        workspace: { id: 'org-1', type: 'organization' },
        membership: { organizationId: 'org-1', status: 'active' },
        activeWorkspaceId: 'org-1',
        tokenRefreshRequired: false,
      },
    });
    http.verify();
  });

  it('normalizes one data envelope into the verified bootstrap DTO', () => {
    const normalized = normalizeBootstrapResponse({
      requestId: 'request-1',
      data: {
        workspace: { id: 'org-1', type: 'organization' },
        membership: { organizationId: 'org-1', status: 'active' },
        activeWorkspaceId: 'org-1',
        tokenRefreshRequired: true,
      },
    });
    expect(normalized.workspace.id).toBe('org-1');
    expect(normalized.membership.organizationId).toBe('org-1');
    expect(normalized.activeWorkspaceId).toBe('org-1');
    expect(normalized.requestId).toBe('request-1');
  });

  it('reports field-name drift using safe field-presence diagnostics', () => {
    expect(() =>
      normalizeBootstrapResponse({
        requestId: 'request-2',
        data: { organization: { id: 'org-1' }, activeOrganizationId: 'org-1', tokenRefreshRequired: false },
      }),
    ).toThrowError(BootstrapContractError);
    try {
      normalizeBootstrapResponse({
        requestId: 'request-2',
        data: { organization: { id: 'secret-value' }, activeOrganizationId: 'secret-value' },
      });
    } catch (error) {
      const contract = error as BootstrapContractError;
      expect(contract.diagnostics.fields).toEqual(['activeOrganizationId', 'organization']);
      expect(JSON.stringify(contract.diagnostics)).not.toContain('secret-value');
    }
  });
});
