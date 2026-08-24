import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActiveOrganizationService } from '../../../core/organizations/active-organization.service';
import { AdminAssignmentsComponent } from './admin-assignments.component';

describe('AdminAssignmentsComponent', () => {
  let http: HttpTestingController;
  let organizationId: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    organizationId = signal<string | null>('organization-1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActiveOrganizationService, useValue: { organizationId } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('includes the active organization when creating an assignment', () => {
    const component = TestBed.runInInjectionContext(() => new AdminAssignmentsComponent());
    component.assignmentForm.patchValue({ title: 'Memory verse', description: 'Learn Proverbs 3:5-6.' });

    component.onCreateAssignment();

    const request = http.expectOne('/api/v1/admin/assignments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      organizationId: 'organization-1',
      name: 'Memory verse',
      data: {
        title: 'Memory verse',
        category: 'bible',
        weekNumber: 1,
        points: 50,
        description: 'Learn Proverbs 3:5-6.',
      },
    });
    request.flush({ data: {} });
    http.expectOne('/api/v1/admin/assignments').flush({ data: { items: [] } });
  });

  it('does not submit without an active organization', () => {
    organizationId.set(null);
    const component = TestBed.runInInjectionContext(() => new AdminAssignmentsComponent());
    component.assignmentForm.patchValue({ title: 'Memory verse' });

    component.onCreateAssignment();

    http.expectNone('/api/v1/admin/assignments');
    expect(component.errorMessage()).toBe('Select an organization before creating an assignment.');
  });
});
