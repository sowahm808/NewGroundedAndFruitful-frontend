import { ApiError } from '../../core/http/api-error';
import { RegistrationResult } from '../../core/auth/auth.service';
import { registrationDestination, registrationErrorMessage } from './create-account.component';

describe('registration routing', () => {
  const result = (nextStep: string, onboardingStatus?: 'organization_required' | 'profile_required') =>
    ({
      intentResult: { intent: 'personal', nextStep, onboardingStatus },
      session: { roles: [], onboardingStatus: 'role_required' },
    }) as unknown as RegistrationResult;

  it('routes the two server-returned registration paths', () => {
    expect(registrationDestination(result('organization_setup'), 'organization')).toBe('/onboarding/organization');
    expect(registrationDestination(result('personal_workspace_setup'), 'personal')).toBe('/onboarding/personal');
  });

  it('does not infer a destination from missing nextStep or the submitted intent', () => {
    expect(registrationDestination(result('', 'organization_required'), 'personal')).toBe('/account/recovery');
    expect(registrationDestination(result('', 'profile_required'), 'organization')).toBe('/account/recovery');
  });
});

describe('registration failures', () => {
  it('distinguishes registration API failure classes', () => {
    expect(registrationErrorMessage(new ApiError(401, 'authentication_required', ''))).toContain('token');
    expect(registrationErrorMessage(new ApiError(403, 'account_disabled', ''))).toContain('disabled');
    expect(registrationErrorMessage(new ApiError(409, 'business_conflict', ''))).toContain('conflicting');
    expect(registrationErrorMessage(new ApiError(422, 'validation_error', ''))).toContain('valid');
    expect(registrationErrorMessage(new ApiError(0, 'network_error', ''))).toContain('connection');
    expect(registrationErrorMessage(new ApiError(500, 'dependency_failure', ''))).toContain('service');
  });
});
