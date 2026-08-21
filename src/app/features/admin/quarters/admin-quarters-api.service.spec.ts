import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import {
  AdminQuartersApiService,
  QUARTER_STATUSES,
  QUARTER_STATUS_LABELS,
  QuarterListItemDto,
  toQuarterRow,
} from './admin-quarters-api.service';

describe('quarter list contract adapter', () => {
  const dto: QuarterListItemDto = {
    id: 'quarter-1',
    name: 'September Quizez',
    description: null,
    startDate: '2026-09-01',
    endDate: '2026-10-01',
    status: 'draft',
    organizationId: 'org-ee',
    createdAt: '2026-08-21T14:56:32.266Z',
    updatedAt: '2026-08-21T14:56:32.266Z',
    version: 1,
  };

  it('maps every published field, preserves date-only values and resolves a matching workspace', () => {
    const row = toQuarterRow(dto, { id: 'org-ee', name: 'Makrozoia Solutions LLC' }, ['admin.quarters.manage']);
    expect(row.startDate).toBe('2026-09-01');
    expect(row.endDate).toBe('2026-10-01');
    expect(row.statusLabel).toBe('Draft');
    expect(row.workspaceName).toBe('Makrozoia Solutions LLC');
    expect(row.updatedAt.toISOString()).toBe(dto.updatedAt);
    expect(row.description).toBeNull();
    expect(row.allowedActions).toEqual(['edit', 'activate']);
  });

  it('defines a non-empty label for every lifecycle state', () => {
    expect(QUARTER_STATUSES.map((status) => QUARTER_STATUS_LABELS[status])).toEqual([
      'Draft',
      'Scheduled',
      'Open',
      'Checkpoint',
      'Closed',
      'Recognition',
      'Archived',
    ]);
  });

  it('does not borrow a workspace name when IDs differ', () => {
    expect(toQuarterRow(dto, { id: 'another-org', name: 'Wrong workspace' }, []).workspaceName).toBe(
      'Workspace unavailable',
    );
  });

  it('does not derive actions from workspace ownership', () => {
    expect(toQuarterRow(dto, { id: 'org-ee', name: 'Workspace' }, []).allowedActions).toEqual([]);
  });

  it('uses granular server capabilities for draft actions', () => {
    expect(toQuarterRow(dto, null, ['admin.quarters.update', 'admin.quarters.transition']).allowedActions).toEqual([
      'edit',
      'activate',
    ]);
  });

  it('renders an explicit warning label for an unknown status', () => {
    spyOn(console, 'warn');
    const row = toQuarterRow({ ...dto, status: 'surprise' }, null, []);
    expect(row.statusLabel).toBe('Unknown status');
    expect(row.allowedActions).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('rejects reversed dates and invalid instants instead of producing partial rows', () => {
    expect(() => toQuarterRow({ ...dto, endDate: '2026-08-31' }, null, [])).toThrowError(/server response was invalid/);
    expect(() => toQuarterRow({ ...dto, updatedAt: 'not-an-instant' }, null, [])).toThrowError(
      /server response was invalid/,
    );
  });
});

describe('AdminQuartersApiService', () => {
  let service: AdminQuartersApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActiveOrganizationService,
          useValue: { activeWorkspace: () => ({ id: 'org-ee', name: 'Makrozoia' }) },
        },
        { provide: AuthService, useValue: { capabilities: () => ['admin.quarters.manage'] } },
      ],
    });
    service = TestBed.inject(AdminQuartersApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('normalizes the data envelope and pagination once without losing row fields', () => {
    const dto = {
      id: 'q1',
      name: 'Quarter',
      description: null,
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      status: 'draft',
      organizationId: 'org-ee',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-21T14:56:32.266Z',
      version: 1,
    };
    let result: any;
    service
      .list({ page: 1, pageSize: 20, status: 'draft', search: 'Quarter', sort: 'startDate' })
      .subscribe((v) => (result = v));
    const request = http.expectOne((req) => req.url.endsWith('/admin/quarters'));
    expect(request.request.params.get('sort')).toBe('startDate');
    expect(request.request.params.get('status')).toBe('draft');
    request.flush({ data: { items: [dto], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } } });
    expect(result.items[0].name).toBe('Quarter');
    expect(result.items[0].workspaceName).toBe('Makrozoia');
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });
});
