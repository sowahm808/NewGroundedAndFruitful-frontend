import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminUsersApiService } from './admin-users-api.service';

describe('AdminUsersApiService', () => {
  let service: AdminUsersApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminUsersApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('normalizes the nested data envelope and sends the users query contract', () => {
    let result: unknown;
    service
      .listUsers({ page: 2, pageSize: 25, status: 'active', sort: 'displayName' })
      .subscribe((value) => (result = value));
    const request = http.expectOne((req) => req.url.endsWith('/admin/users'));
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('sort')).toBe('displayName');
    const payload = { items: [], pagination: { page: 2, pageSize: 25, total: 0, totalPages: 1 } };
    request.flush({ data: payload });
    expect(result).toEqual(payload);
  });
});
