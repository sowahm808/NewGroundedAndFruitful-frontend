import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminQuartersApiService, Quarter } from './admin-quarters-api.service';

describe('AdminQuartersApiService', () => {
  let service: AdminQuartersApiService;
  let http: HttpTestingController;
  const quarter: Quarter = {
    id: 'quarter-1',
    name: 'Autumn 2026',
    startsOn: '2026-09-01',
    endsOn: '2026-11-30',
    status: 'draft',
    updatedAt: '2026-08-20T12:00:00Z',
    version: 3,
    allowedActions: ['edit', 'activate'],
  };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminQuartersApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('normalizes the contract envelope and maps list parameters', () => {
    let result: unknown;
    service
      .list({ page: 2, pageSize: 20, status: 'draft', search: 'autumn', sort: 'name' })
      .subscribe((v) => (result = v));
    const request = http.expectOne((req) => req.url.endsWith('/admin/quarters'));
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.get('status')).toBe('draft');
    expect(request.request.params.get('search')).toBe('autumn');
    expect(request.request.params.get('sort')).toBe('name');
    const payload = { items: [quarter], pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 } };
    request.flush({ data: payload, requestId: 'request-1' });
    expect(result).toEqual(payload);
  });

  it('maps create and versioned edit requests without extra fields', () => {
    service
      .create({ organizationId: 'organization-1', name: 'Autumn 2026', startsOn: '2026-09-01', endsOn: '2026-11-30' })
      .subscribe();
    const create = http.expectOne((req) => req.url.endsWith('/admin/quarters'));
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      organizationId: 'organization-1',
      name: 'Autumn 2026',
      startsOn: '2026-09-01',
      endsOn: '2026-11-30',
    });
    create.flush({ data: quarter });
    service
      .update(quarter.id, {
        name: quarter.name,
        startsOn: quarter.startsOn,
        endsOn: quarter.endsOn,
        expectedVersion: 3,
      })
      .subscribe();
    const update = http.expectOne((req) => req.url.endsWith('/admin/quarters/quarter-1'));
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.expectedVersion).toBe(3);
    update.flush({ data: quarter });
  });

  it('uses the advertised lifecycle command and expected version', () => {
    service.command(quarter, 'activate').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/admin/quarters/quarter-1/activate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ expectedVersion: 3 });
    request.flush({ data: { ...quarter, status: 'active' } });
  });
});
