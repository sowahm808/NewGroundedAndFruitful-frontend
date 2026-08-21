export type UserRole = 'child' | 'parent' | 'mentor' | 'observer' | 'admin' | 'super_admin';
export type MembershipState = 'active' | 'pending' | 'suspended' | 'deleted';
export type RegistrationIntent = 'personal' | 'organization';
export interface RegistrationIntentResponse {
  readonly intent: RegistrationIntent;
  readonly nextStep?: string;
  readonly onboardingStatus?: OnboardingStatus;
}
export type WorkspaceType = 'personal' | 'organization';
export interface SessionMembership {
  readonly id?: string;
  readonly organizationId?: string;
  readonly organizationName?: string;
  readonly roles?: readonly UserRole[];
  readonly status?: MembershipState;
}
export type OnboardingStatus =
  | 'complete'
  | 'registration_intent_required'
  | 'personal_workspace_required'
  | 'organization_setup_required'
  | 'organization_required'
  | 'migration_required'
  | 'consent_required'
  | 'profile_required'
  | 'role_required'
  | 'pending_approval';
export interface SessionUser {
  readonly uid: string;
  readonly email?: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
  /** Platform-scoped roles are reported independently from organization memberships. */
  readonly platformRoles?: readonly UserRole[];
  readonly disabled: boolean;
  readonly onboardingStatus: OnboardingStatus;
  readonly nextStep?: string;
  readonly registrationIntent?: RegistrationIntent;
  readonly memberships: readonly SessionMembership[];
  readonly activeOrganizationId?: string;
  /** Stable identifier for the workspace selected by the backend session. */
  readonly activeWorkspaceId?: string;
  /** The backend-selected workspace. It is context only; effective roles remain authoritative. */
  readonly activeWorkspace?: { readonly type: WorkspaceType; readonly id: string; readonly name?: string };
  readonly workspaces?: readonly { readonly type: WorkspaceType; readonly id: string; readonly name?: string }[];
  /** The backend-calculated authority. It is never derived from memberships in the browser. */
  readonly effectiveRoles?: readonly UserRole[];
  readonly personalWorkspace?: { readonly id: string; readonly displayName?: string; readonly setupComplete?: boolean };
  readonly elevation?: {
    readonly active: boolean;
    readonly scope: string;
    readonly reason?: string;
    readonly expiresAt: string;
    readonly canEnd?: boolean;
  };
  readonly authorization?: { readonly source: string; readonly migrationRequired: boolean };
}
export interface ClaimSynchronization {
  readonly status: 'synchronized' | 'refresh_required' | 'failed';
  readonly tokenRefreshRequired: boolean;
}
export interface SessionData extends SessionUser {
  readonly claimSynchronization: ClaimSynchronization;
}
export interface ApiResponse<T> {
  readonly data: T;
  readonly requestId?: string;
}
/** @deprecated Data pages use DataPageState from shared/state/data-page-state. */
export type { DataPageState as LoadState } from '../../shared/state/data-page-state';
export interface CharacterQuality {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}
export interface CharacterRating {
  readonly qualityId: string;
  readonly rating: number | null;
}
export type BibleActivityType = 'multiple_choice' | 'true_false' | 'scripture_reading' | 'reflection' | 'memory_verse';
export interface BibleActivity {
  readonly id: string;
  readonly title: string;
  readonly type: BibleActivityType;
  readonly prompt: string;
  readonly participationPoints?: number;
}
export interface TeamProgress {
  readonly individualContribution: number;
  readonly quarterPoints: number;
  readonly target: number;
  readonly programWeek: number;
}
export interface DailyJourney {
  readonly childName: string;
  readonly programWeek: number;
  readonly completedActivityIds: readonly string[];
  readonly individualPoints: number;
  readonly team: TeamProgress;
  readonly readingStatus: string;
  readonly projectStatus: string;
}
export type AcademicSupportStatus = 'requested' | 'assigned' | 'active' | 'completed' | 'cancelled';
export type ReflectionMediaType = 'text' | 'audio' | 'video';
export interface ReadingReflection {
  readonly id: string;
  readonly week: number;
  readonly responseType: ReflectionMediaType;
  readonly response: string;
  readonly submittedAt: string;
}
export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
