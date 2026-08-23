import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApiService, AdminRecord } from './admin-api.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends server pagination and allowlisted query values', () => {
    service.list('users', { page: 3, pageSize: 25, status: 'active', sort: 'label', search: 'Ada' }).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/admin/users'));
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('pageSize')).toBe('25');
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('sort')).toBe('label');
    expect(request.request.params.get('search')).toBe('Ada');
    request.flush({ data: { items: [], page: 3, pageSize: 25, total: 0 } });
  });

  it('carries the version in the command body and If-Match header', () => {
    const record: AdminRecord = { id: 'member/1', label: 'Member', status: 'pending', version: 7 };
    service.command('memberships', record, 'approve').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/admin/memberships/member%2F1/commands/approve'));
    expect(request.request.headers.get('If-Match')).toBe('"7"');
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.request.body).toEqual({ version: 7 });
    request.flush({ data: record });
  });
});
