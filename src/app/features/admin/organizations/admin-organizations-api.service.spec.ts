import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminOrganizationsApiService } from './admin-organizations-api.service';

describe('AdminOrganizationsApiService', () => {
  it('makes the production organization list request and unwraps its envelope', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AdminOrganizationsApiService);
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;
    service.list('fruitful').subscribe((value) => (result = value));
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/organizations'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('search')).toBe('fruitful');
    request.flush({ data: { items: [], canCreate: false } });
    expect(result).toEqual({ items: [], canCreate: false });
    http.verify();
  });
});
