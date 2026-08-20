import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { AdminUsersApiService, AdminUsersPayload } from './admin-users-api.service';
import { AdminUsersComponent } from './admin-users.component';

const users = [
  {
    id: '1',
    displayName: 'Michael Sowah',
    email: 'michael@example.com',
    status: 'active',
    roles: ['parent'],
    organizationIds: [],
    updatedAt: { _seconds: 1_787_108_713, _nanoseconds: 966_000_000 },
  },
  {
    id: '2',
    displayName: 'Ama Mensah',
    email: 'ama@example.com',
    status: 'disabled',
    roles: ['super_admin'],
    organizationIds: ['org-1', 'org-2'],
    updatedAt: null,
  },
  {
    id: '3',
    displayName: 'Kojo Asare',
    email: 'kojo@example.com',
    status: 'invited',
    roles: ['mentor'],
    organizationIds: ['org-1'],
    updatedAt: 'invalid',
  },
] as const;
const payload: AdminUsersPayload = { items: users, pagination: { page: 1, pageSize: 25, total: 3, totalPages: 1 } };

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let api: jasmine.SpyObj<AdminUsersApiService>;

  function create(response = of(payload)): void {
    api = jasmine.createSpyObj<AdminUsersApiService>('AdminUsersApiService', ['listUsers']);
    api.listUsers.and.returnValue(response);
    TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [provideRouter([]), { provide: AdminUsersApiService, useValue: api }],
    });
    fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();
  }
  function load(): void {
    flushMicrotasks();
    fixture.detectChanges();
  }

  it('renders all user fields, humanized roles, safe dates, and the server range', fakeAsync(() => {
    create();
    load();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(text).toContain('Michael Sowah');
    expect(text).toContain('michael@example.com');
    expect(text).toContain('Super Admin');
    expect(text).toContain('Active');
    expect(text).toContain('None');
    expect(text).toContain('2');
    expect(text).toContain('Aug 19, 2026');
    expect(text).toContain('Not available');
    expect(text).toContain('Showing 1–3 of 3');
    expect((fixture.nativeElement.querySelector('nav button:first-child') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('nav button:last-child') as HTMLButtonElement).disabled).toBeTrue();
  }));

  it('renders the user-specific empty state', fakeAsync(() => {
    create(of({ items: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }));
    load();
    expect(fixture.nativeElement.textContent).toContain('No users match the current filters');
  }));

  it('resets to page one and sends selected filter and sort values', fakeAsync(() => {
    create();
    load();
    fixture.componentInstance.goTo(2);
    fixture.componentInstance.draftStatus = 'disabled';
    fixture.componentInstance.draftSort = 'displayName';
    fixture.componentInstance.applyFilters();
    expect(api.listUsers.calls.mostRecent().args[0]).toEqual({
      page: 1,
      pageSize: 25,
      status: 'disabled',
      sort: 'displayName',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Filters applied');
  }));

  it('shows errors and retries the same request', fakeAsync(() => {
    create(throwError(() => new ApiError(500, 'dependency_failure', 'Service unavailable')));
    load();
    expect(fixture.nativeElement.textContent).toContain('Service unavailable');
    api.listUsers.and.returnValue(of(payload));
    (fixture.nativeElement.querySelector('gf-alert button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Michael Sowah');
  }));

  it('cancels stale requests so older results cannot replace newer filters', fakeAsync(() => {
    const older = new Subject<AdminUsersPayload>();
    const newer = new Subject<AdminUsersPayload>();
    create();
    load();
    api.listUsers.and.returnValues(older, newer);
    fixture.componentInstance.draftStatus = 'active';
    fixture.componentInstance.applyFilters();
    fixture.componentInstance.draftStatus = 'disabled';
    fixture.componentInstance.applyFilters();
    const latest = {
      ...payload,
      items: [{ ...users[0], displayName: 'Latest User' }],
      pagination: { page: 3, pageSize: 25, total: 51, totalPages: 3 },
    };
    newer.next(latest);
    fixture.detectChanges();
    older.next(payload);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Latest User');
    expect(fixture.nativeElement.textContent).not.toContain('Ama Mensah');
  }));
});
