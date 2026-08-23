import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { AdminTeamsComponent } from './admin-teams.component';

describe('AdminTeamsComponent', () => {
  let fixture: ComponentFixture<AdminTeamsComponent>;
  let component: AdminTeamsComponent;
  let http: HttpTestingController;
  let organizationId: ReturnType<typeof signal<string | null>>;

  beforeEach(async () => {
    organizationId = signal<string | null>('organization-1');
    await TestBed.configureTestingModule({
      imports: [AdminTeamsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActiveOrganizationService, useValue: { organizationId } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminTeamsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/admin/teams').flush({ data: { items: [] } });
  });

  afterEach(() => http.verify());

  it('includes the active organization context when creating a team', () => {
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });

    component.onCreateTeam();

    const create = http.expectOne('/api/v1/admin/teams');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({
      name: 'Jesus team',
      capacity: 5,
      targetPoints: 5000,
      organizationId: 'organization-1',
    });
    create.flush({ data: {} });
    http.expectOne('/api/v1/admin/teams').flush({ data: { items: [] } });
  });

  it('does not submit without an active organization', () => {
    organizationId.set(null);
    component.teamForm.setValue({ name: 'Jesus team', capacity: 5, targetPoints: 5000 });

    component.onCreateTeam();

    expect(component.errorMessage()).toBe('Select an organization before creating a team.');
    http.expectNone('/api/v1/admin/teams');
  });
});
