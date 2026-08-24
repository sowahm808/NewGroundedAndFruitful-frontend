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

  it('accepts published participant summaries that do not include a mutation version', () => {
    let participantVersion: number | undefined = -1;
    service.list({}).subscribe((page) => (participantVersion = page.items[0].version));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/participants'))
      .flush({
        data: {
          items: [{ id: 'p1', displayName: 'Ama', status: 'active', updatedAt: '2026-08-22T00:00:00Z' }],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });
    expect(participantVersion).toBeUndefined();
  });

  it('reconciles guardian email and named-reference responses for the participant table', () => {
    let participant: unknown;
    service.list({}).subscribe((page) => (participant = page.items[0]));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/participants'))
      .flush({
        data: {
          items: [
            {
              id: 'p1',
              displayName: 'Ama',
              status: 'active',
              guardianEmail: ' guardian@example.com ',
              team: { id: 'team-1', approvedDisplayName: ' Seedlings ' },
              updatedAt: '2026-08-22T00:00:00Z',
            },
          ],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });

    expect(participant).toEqual(
      jasmine.objectContaining({
        linkedGuardian: 'Invited (guardian@example.com)',
        guardianEmail: 'guardian@example.com',
        team: 'Seedlings',
      }),
    );
  });

  it('prefers a resolved guardian identity over the invitation email', () => {
    let linkedGuardian = '';
    service.list({}).subscribe((page) => (linkedGuardian = page.items[0].linkedGuardian ?? ''));
    http
      .expectOne((candidate) => candidate.url.endsWith('/admin/participants'))
      .flush({
        data: {
          items: [
            {
              id: 'p1',
              name: 'Ama',
              enrollmentStatus: 'active',
              guardianEmail: 'guardian@example.com',
              linkedGuardian: { displayName: 'Akosua Parent', email: 'guardian@example.com' },
              updatedAt: '2026-08-22T00:00:00Z',
            },
          ],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
        },
      });

    expect(linkedGuardian).toBe('Akosua Parent');
  });

  it('posts a guardian invitation to the participant-scoped endpoint', () => {
    service.inviteGuardian('participant/1', { email: 'guardian@example.com' }).subscribe();

    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/admin/participants/participant%2F1/invite-guardian'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'guardian@example.com' });
    request.flush({ data: { status: 'pending_acceptance' } });
  });

  it('includes optional guardian and team fields when enrolling a participant', () => {
    const payload = {
      displayName: 'Ama',
      birthDate: '2015-01-01',
      programId: 'default-program',
      teamId: 'team-1',
      guardianEmail: 'guardian@example.com',
    };
    service.enroll(payload).subscribe();

    const request = http.expectOne((candidate) => candidate.url.endsWith('/admin/participants'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ data: { id: 'participant-1' } });
  });
});
