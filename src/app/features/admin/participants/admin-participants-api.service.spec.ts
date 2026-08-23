import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminParticipantsApiService } from './admin-participants-api.service';

describe('AdminParticipantsApiService', () => {
  let service: AdminParticipantsApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminParticipantsApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the participant pagination and verified recently-updated sort contract', () => {
    service.list({ page: 1, pageSize: 25, sort: 'updatedAt_desc' }).subscribe();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/participants'));
    expect(request.request.params.get('sort')).toBe('updatedAt_desc');
    expect(request.request.params.has('sortBy')).toBeFalse();
    expect(request.request.urlWithParams).not.toContain('-updatedAt');
    request.flush({ data: { items: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } } });
  });

  it('omits all-status and safely serializes search', () => {
    service.list({ page: 1, pageSize: 25, search: 'Ann & Bob' }).subscribe();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/participants'));
    expect(request.request.params.has('status')).toBeFalse();
    expect(request.request.params.get('search')).toBe('Ann & Bob');
    request.flush({ data: { items: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } } });
  });

  it('normalizes the participant envelope and validates required fields', () => {
    let name = '';
    service.list({}).subscribe((page) => (name = page.items[0].name));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/participants'))
      .flush({
        data: {
          items: [{ id: 'p1', name: 'Ada', enrollmentStatus: 'active', version: 1, updatedAt: '2026-08-22T00:00:00Z' }],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });
    expect(name).toBe('Ada');
  });

  it('hydrates the published displayName and status fields', () => {
    let participantName = '';
    service.list({}).subscribe((page) => (participantName = page.items[0].name));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/participants'))
      .flush({
        data: {
          items: [{ id: 'p1', displayName: 'Ama', status: 'pending', version: 3, updatedAt: '2026-08-22T00:00:00Z' }],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });
    expect(participantName).toBe('Ama');
  });
});
