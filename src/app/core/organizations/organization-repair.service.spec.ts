import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { OrganizationRepairService } from './organization-repair.service';

describe('OrganizationRepairService', () => {
  it('requests ownership-verified repair without client-supplied authority or organization context', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(OrganizationRepairService);
    const http = TestBed.inject(HttpTestingController);

    service.repair().subscribe((result) => expect(result.organizationId).toBe('organization-1'));

    const request = http.expectOne(`${environment.apiUrl}/onboarding/organization/repair`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      data: { organizationId: 'organization-1', workspaceId: 'organization-1', tokenRefreshRequired: true },
    });
    http.verify();
  });
});
