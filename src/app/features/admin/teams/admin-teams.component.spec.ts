import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { OrganizationRepairService } from '../../../core/organizations/organization-repair.service';
import { AdminTeamsApiService, TeamItem } from './admin-teams-api.service';
import { AdminTeamsComponent } from './admin-teams.component';

describe('AdminTeamsComponent', () => {
  let fixture: ComponentFixture<AdminTeamsComponent>;
  let component: AdminTeamsComponent;
  let organizationId: ReturnType<typeof signal<string | null>>;
  let session: ReturnType<typeof signal<Record<string, unknown>>>;
  let api: jasmine.SpyObj<AdminTeamsApiService>;
  let auth: {
    user: typeof session;
    initialize: jasmine.Spy;
    refreshSession: jasmine.Spy;
    logout: jasmine.Spy;
    navigate: jasmine.Spy;
  };
  let repair: jasmine.Spy;

  beforeEach(async () => {
    organizationId = signal<string | null>('organization-1');
    session = signal<Record<string, unknown>>({ migrationRequired: false });
    api = jasmine.createSpyObj<AdminTeamsApiService>('AdminTeamsApiService', ['list', 'create']);
    api.list.and.returnValue(of([]));
    auth = {
      user: session,
      initialize: jasmine.createSpy('initialize').and.resolveTo(),
      refreshSession: jasmine.createSpy('refreshSession').and.resolveTo(null),
      logout: jasmine.createSpy('logout').and.resolveTo(),
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
    };
    repair = jasmine
      .createSpy('repair')
      .and.returnValue(
        of({ organizationId: 'organization-1', workspaceId: 'organization-1', tokenRefreshRequired: false }),
      );
    await TestBed.configureTestingModule({
      imports: [AdminTeamsComponent],
      providers: [
        { provide: AdminTeamsApiService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: ActiveOrganizationService, useValue: { organizationId } },
        { provide: OrganizationRepairService, useValue: { repair } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminTeamsComponent);
    component = fixture.componentInstance;
  });

  it('waits for authentication initialization before loading teams', async () => {
    let finishInitialization!: () => void;
    auth.initialize.and.returnValue(new Promise<void>((resolve) => (finishInitialization = resolve)));
    fixture.detectChanges();
    expect(api.list).not.toHaveBeenCalled();
    finishInitialization();
    await fixture.whenStable();
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('submits canonical organization context once and refreshes after success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    api.create.and.returnValue(of({ id: 'team-1' } as TeamItem));
    component.openModal();
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });
    await component.onCreateTeam();
    expect(api.create).toHaveBeenCalledOnceWith({
      name: 'Jesus team',
      capacity: 5,
      targetPoints: 5000,
      organizationId: 'organization-1',
    });
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(component.showModal()).toBeFalse();
  });

  it('retains values and maps a 422 field response', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    api.create.and.returnValue(
      throwError(() => new ApiError(422, 'validation_error', 'Invalid', { fields: { name: ['Required'] } })),
    );
    const values = { name: 'Jesus team', capacity: 5, targetPoints: 5000 };
    component.teamForm.setValue(values);
    await component.onCreateTeam();
    expect(component.teamForm.getRawValue()).toEqual(values);
    expect(component.errorMessage()).toContain('name: Required');
  });

  it('prevents duplicate submissions while a request is in flight', () => {
    fixture.detectChanges();
    const pending = new Subject<TeamItem>();
    api.create.and.returnValue(pending);
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });
    void component.onCreateTeam();
    void component.onCreateTeam();
    expect(api.create).toHaveBeenCalledTimes(1);
    pending.error(new ApiError(500, 'dependency_failure', 'Unavailable'));
  });

  it('keeps the session on 403', async () => {
    fixture.detectChanges();
    api.create.and.returnValue(throwError(() => new ApiError(403, 'relationship_forbidden', 'Forbidden')));
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });
    await component.onCreateTeam();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('permission');
  });

  it('clears the session and returns to Teams after a second 401', async () => {
    fixture.detectChanges();
    api.create.and.returnValue(throwError(() => new ApiError(401, 'authentication_required', 'Sign-in failed')));
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });
    await component.onCreateTeam();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(auth.navigate).toHaveBeenCalledOnceWith('/auth/login?returnUrl=%2Fadmin%2Fteams', true);
    expect(component.errorMessage()).not.toContain('Sign-in failed');
  });
});
