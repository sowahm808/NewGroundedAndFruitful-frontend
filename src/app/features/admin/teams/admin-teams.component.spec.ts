import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { OrganizationRepairService } from '../../../core/organizations/organization-repair.service';
import { AdminTeamsComponent } from './admin-teams.component';

describe('AdminTeamsComponent', () => {
  let fixture: ComponentFixture<AdminTeamsComponent>;
  let component: AdminTeamsComponent;
  let http: HttpTestingController;
  let organizationId: ReturnType<typeof signal<string | null>>;
  let session: ReturnType<typeof signal<Record<string, unknown>>>;
  let repair: jasmine.Spy;
  let refreshSession: jasmine.Spy;

  beforeEach(async () => {
    organizationId = signal<string | null>('organization-1');
    session = signal<Record<string, unknown>>({ migrationRequired: false });
    repair = jasmine.createSpy('repair').and.returnValue(
      of({ organizationId: 'organization-1', workspaceId: 'organization-1', tokenRefreshRequired: false }),
    );
    refreshSession = jasmine.createSpy('refreshSession').and.resolveTo(null);
    await TestBed.configureTestingModule({
      imports: [AdminTeamsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: session, refreshSession } },
        { provide: ActiveOrganizationService, useValue: { organizationId } },
        { provide: OrganizationRepairService, useValue: { repair } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminTeamsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/teams').flush({ data: { items: [] } });
  });

  afterEach(() => http.verify());

  it('includes the active organization context when creating a team', async () => {
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });

    const submission = component.onCreateTeam();

    const create = http.expectOne('/api/v1/admin/teams');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      name: 'Jesus team',
      capacity: 5,
      targetPoints: 5000,
      organizationId: 'organization-1',
    });
    create.flush({ data: {} });
    await submission;
    http.expectOne('/api/v1/admin/teams').flush({ data: { items: [] } });
    expect(repair).not.toHaveBeenCalled();
  });

  it('repairs a legacy session, refreshes its token and submits exactly once', async () => {
    organizationId.set(null);
    session.set({ migrationRequired: true });
    refreshSession.and.callFake(async () => {
      organizationId.set('organization-1');
      return null;
    });
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });

    const submission = component.onCreateTeam();
    await Promise.resolve();
    await Promise.resolve();

    const create = http.expectOne('/api/v1/admin/teams');
    expect(create.request.body.organizationId).toBe('organization-1');
    create.flush({ data: {} });
    await submission;
    http.expectOne('/api/v1/admin/teams').flush({ data: { items: [] } });
    expect(repair).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledOnceWith(false);
  });

  it('retains entered values and does not call the team API when repair fails', async () => {
    organizationId.set(null);
    session.set({ authorization: { source: 'legacy_user_profile', migrationRequired: true } });
    repair.and.returnValue(throwError(() => new Error('Organization repair is not authorized.')));
    const values = { name: 'Jesus team', capacity: 7, targetPoints: 6400 };
    component.teamForm.setValue(values);

    await component.onCreateTeam();

    expect(component.teamForm.getRawValue()).toEqual(values);
    expect(component.errorMessage()).toBe('Organization repair is not authorized.');
    http.expectNone('/api/v1/admin/teams');
  });

  it('prevents duplicate submissions while a request is in flight', () => {
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });

    void component.onCreateTeam();
    void component.onCreateTeam();

    const requests = http.match('/api/v1/admin/teams').filter((request) => request.request.method === 'POST');
    expect(requests.length).toBe(1);
    requests[0].flush({}, { status: 500, statusText: 'Server Error' });
  });
});
