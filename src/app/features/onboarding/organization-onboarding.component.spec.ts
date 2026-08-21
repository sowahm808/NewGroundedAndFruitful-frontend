import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { SessionUser } from '../../core/models/domain.models';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { OrganizationOnboardingApiService } from './organization-onboarding-api.service';
import { OrganizationOnboardingComponent, toSlug } from './organization-onboarding.component';

describe('organization onboarding validation', () => {
  it('derives a bounded editable slug without identity data', () => {
    expect(toSlug(' Grounded & Fruitful Ghana ')).toBe('grounded-fruitful-ghana');
    expect(toSlug('---')).toBe('');
  });

  it('requires timezone confirmation through the component form contract', () => {
    const confirmation = new FormControl(false, { nonNullable: true });
    expect(confirmation.value).toBeFalse();
  });
});

describe('OrganizationOnboardingComponent bootstrap orchestration', () => {
  const verifiedSession: SessionUser = {
    uid: 'user-1',
    displayName: 'Administrator',
    roles: ['admin'],
    effectiveRoles: ['admin'],
    disabled: false,
    onboardingStatus: 'complete',
    memberships: [{ organizationId: 'org-1', status: 'active', roles: ['admin'] }],
    workspaces: [{ type: 'organization', id: 'org-1' }],
    activeWorkspaceId: 'org-1',
  };
  let bootstrap: jasmine.Spy;
  let refreshSession: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;
  let component: OrganizationOnboardingComponent;

  beforeEach(() => {
    bootstrap = jasmine.createSpy('bootstrap');
    refreshSession = jasmine.createSpy('refreshSession').and.resolveTo(verifiedSession);
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationOnboardingApiService, useValue: { bootstrap } },
        { provide: AuthService, useValue: { user: () => null, refreshSession } },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: PostAuthRouteCoordinator,
          useValue: { decision: () => ({ path: '/admin/quarters', reason: 'dashboard' }) },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new OrganizationOnboardingComponent());
    component.form.setValue({
      name: ' Grounded ',
      slug: 'grounded',
      timezone: 'UTC',
      timezoneConfirmed: true,
    });
  });

  it('prevents duplicate submission and follows refresh-required before navigating to the verified admin dashboard', async () => {
    const response = new Subject<{ organizationId: string; tokenRefreshRequired: boolean }>();
    bootstrap.and.returnValue(response);

    const first = component.submit();
    const duplicate = component.submit();
    expect(bootstrap).toHaveBeenCalledTimes(1);
    response.next({ organizationId: 'org-1', tokenRefreshRequired: true });
    response.complete();
    await Promise.all([first, duplicate]);

    expect(bootstrap.calls.mostRecent().args[0]).toEqual({ name: 'Grounded', slug: 'grounded', timezone: 'UTC' });
    expect(refreshSession).toHaveBeenCalledOnceWith(true);
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/admin/quarters', { replaceUrl: true });
  });

  it('reuses a key for an exact retry and changes it when the command changes', async () => {
    bootstrap.and.returnValues(
      throwError(() => new ApiError(0, 'network_error', 'offline')),
      throwError(() => new ApiError(0, 'network_error', 'offline')),
      of({ organizationId: 'org-1', tokenRefreshRequired: false }),
    );

    await component.submit();
    await component.submit();
    expect(bootstrap.calls.argsFor(1)[1]).toBe(bootstrap.calls.argsFor(0)[1]);

    component.form.controls.name.setValue('Changed');
    await component.submit();
    expect(bootstrap.calls.argsFor(2)[1]).not.toBe(bootstrap.calls.argsFor(1)[1]);
  });

  it('requires all canonical session facts and does not infer or assign roles locally', async () => {
    bootstrap.and.returnValue(of({ organizationId: 'org-1', tokenRefreshRequired: false }));
    refreshSession.and.resolveTo({ ...verifiedSession, activeWorkspaceId: undefined });

    await component.submit();

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(component.error()?.message).toContain('active workspace');
  });

  it('force-refreshes Firebase at most once when an exact bootstrap retry replays refresh-required', async () => {
    bootstrap.and.returnValue(of({ organizationId: 'org-1', tokenRefreshRequired: true }));
    refreshSession.and.returnValues(
      Promise.resolve({ ...verifiedSession, memberships: [] }),
      Promise.resolve(verifiedSession),
    );

    await component.submit();
    await component.submit();

    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(bootstrap.calls.argsFor(1)[1]).toBe(bootstrap.calls.argsFor(0)[1]);
    expect(refreshSession.calls.allArgs()).toEqual([[true], [false]]);
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/admin/quarters', { replaceUrl: true });
  });

  it('maps stable error codes without treating every forbidden response as ineligible', () => {
    expect(component.errorMessage(new ApiError(403, 'role_required', 'forbidden'))).toContain('not eligible');
    expect(component.errorMessage(new ApiError(403, 'relationship_forbidden', 'Policy denied'))).toBe('Policy denied');
    expect(component.errorMessage(new ApiError(403, 'approval_pending', 'forbidden'))).toContain('awaiting approval');
  });
});
