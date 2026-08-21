import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PostAuthRouteCoordinator } from '../../core/auth/post-auth-route.service';
import { ApiError } from '../../core/http/api-error';
import { SessionUser } from '../../core/models/domain.models';
import { PersonalOnboardingApiService } from './personal-onboarding-api.service';
import { PersonalOnboardingComponent, isIanaTimezone, personalSetupConfirmed } from './personal-onboarding.component';

describe('PersonalOnboardingComponent', () => {
  const pending: SessionUser = {
    uid: 'personal-1',
    displayName: 'Parent',
    roles: [],
    disabled: false,
    registrationIntent: 'personal',
    onboardingStatus: 'personal_workspace_required',
    nextStep: 'personal_workspace_setup',
    memberships: [],
    workspaces: [],
  };
  const complete: SessionUser = {
    ...pending,
    roles: ['parent'],
    effectiveRoles: ['parent'],
    onboardingStatus: 'complete',
    nextStep: undefined,
    memberships: [{ id: 'member-1', status: 'active', roles: ['parent'] }],
    workspaces: [{ type: 'personal', id: 'personal-workspace-1', name: 'Personal' }],
    activeWorkspaceId: 'personal-workspace-1',
  };
  let bootstrap: jasmine.Spy;
  let refreshSession: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;
  let component: PersonalOnboardingComponent;

  beforeEach(() => {
    sessionStorage.clear();
    bootstrap = jasmine.createSpy('bootstrap').and.returnValue(of({ tokenRefreshRequired: false }));
    refreshSession = jasmine.createSpy('refreshSession').and.resolveTo(complete);
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: PersonalOnboardingApiService, useValue: { bootstrap } },
        { provide: AuthService, useValue: { user: () => pending, refreshSession, logout: () => Promise.resolve() } },
        { provide: Router, useValue: { url: '/onboarding/personal', navigateByUrl } },
        {
          provide: PostAuthRouteCoordinator,
          useValue: {
            decision: () => ({ path: '/parent/children', reason: 'dashboard' }),
            resolvePostAuthenticationRoute: () => null,
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new PersonalOnboardingComponent());
  });

  it('automatically creates once, supplies the browser timezone, reloads session, then navigates', async () => {
    const response = new Subject<{ tokenRefreshRequired: boolean }>();
    bootstrap.and.returnValue(response);
    component.ngOnInit();
    component.ngOnInit();
    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(bootstrap.calls.mostRecent().args[0].timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();

    response.next({ tokenRefreshRequired: false });
    response.complete();
    await component.retry();
    expect(refreshSession).toHaveBeenCalledWith(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/parent/children', { replaceUrl: true });
  });

  it('force-refreshes only when required', async () => {
    bootstrap.and.returnValue(of({ tokenRefreshRequired: true }));
    await (component.ngOnInit(), component.retry());
    expect(refreshSession).toHaveBeenCalledOnceWith(true);
  });

  it('waits for workspace, membership, active workspace, and dashboard confirmation', async () => {
    refreshSession.and.resolveTo({ ...complete, memberships: [] });
    component.ngOnInit();
    await component.retry();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(component.state()).toBe('session_error');
  });

  it('retries the POST with the same logical key instead of merely polling session', async () => {
    bootstrap.and.returnValues(
      throwError(() => new Error('offline')),
      of({ tokenRefreshRequired: false }),
    );
    component.ngOnInit();
    await component.retry();
    const firstKey = bootstrap.calls.argsFor(0)[1];
    await component.retry();
    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(bootstrap.calls.argsFor(1)[1]).toBe(firstKey);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('treats already-completed conflict as a reason to reload and continue', async () => {
    bootstrap.and.returnValue(throwError(() => new ApiError(409, 'business_conflict', 'already complete')));
    component.ngOnInit();
    await component.retry();
    expect(refreshSession).toHaveBeenCalledOnceWith(false);
    expect(navigateByUrl).toHaveBeenCalled();
  });

  it('does not bootstrap organization intent and accepts empty pre-setup roles', () => {
    const auth = TestBed.inject(AuthService) as unknown as { user: () => SessionUser };
    auth.user = () => ({ ...pending, registrationIntent: 'organization' });
    const other = TestBed.runInInjectionContext(() => new PersonalOnboardingComponent());
    other.ngOnInit();
    expect(bootstrap).not.toHaveBeenCalled();
    expect(pending.roles).toEqual([]);
  });

  it('offers a real retry state after creation failure', async () => {
    bootstrap.and.returnValue(throwError(() => new Error('offline')));
    component.ngOnInit();
    await component.retry();
    expect(component.state()).toBe('recoverable_error');
    expect(component.error()).toContain('Try setup again');
  });

  it('validates IANA timezones and all authoritative completion facts', () => {
    expect(isIanaTimezone('America/New_York')).toBeTrue();
    expect(isIanaTimezone('not/a-zone')).toBeFalse();
    expect(personalSetupConfirmed(complete)).toBeTrue();
    expect(personalSetupConfirmed({ ...complete, activeWorkspaceId: undefined })).toBeFalse();
  });
});
