import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionUser } from '../models/domain.models';
import { PostAuthRouteCoordinator } from './post-auth-route.service';

describe('PostAuthRouteCoordinator', () => {
  let coordinator: PostAuthRouteCoordinator;
  const session = (changes: Partial<SessionUser> = {}): SessionUser => ({
    uid: 'user',
    displayName: 'Person',
    roles: [],
    disabled: false,
    onboardingStatus: 'organization_setup_required',
    memberships: [],
    nextStep: 'organization_setup',
    ...changes,
  });
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    coordinator = TestBed.inject(PostAuthRouteCoordinator);
  });
  it('routes the production pre-onboarding session to organization setup despite empty roles', () => {
    expect(coordinator.decision(session()).path).toBe('/onboarding/organization');
  });
  it('keeps the exact required organization route to prevent a loop', () => {
    expect(coordinator.resolvePostAuthenticationRoute(session(), '/onboarding/organization')).toBeNull();
  });
  it('keeps personal and organization journeys separate', () => {
    expect(coordinator.decision(session({ nextStep: 'personal_workspace_setup' })).path).toBe('/onboarding/personal');
    expect(coordinator.decision(session()).path).not.toBe('/onboarding/personal');
  });
  it('routes only completed roleless sessions to role recovery', () => {
    expect(coordinator.decision(session({ nextStep: undefined, onboardingStatus: 'complete' })).path).toBe(
      '/account/role-required',
    );
  });
  it('routes a completed admin session to its dashboard', () => {
    expect(
      coordinator.decision(session({ nextStep: undefined, onboardingStatus: 'complete', roles: ['admin'] })).path,
    ).toBe('/admin/quarters');
  });
});
