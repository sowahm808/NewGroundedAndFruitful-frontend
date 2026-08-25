export type UserRole = 'owner' | 'child' | 'parent' | 'mentor' | 'observer' | 'admin' | 'super_admin';
export type ProductPersona = 'child' | 'parent' | 'mentor' | 'observer';
/** Opaque, backend-issued authority. New capabilities do not require a frontend release. */
export type Capability = string;
export type MembershipState = 'active' | 'pending' | 'suspended' | 'deleted';
export type RegistrationIntent = 'personal' | 'organization';
export type AccountNextStep =
  | 'choose_account_type'
  | 'personal_workspace_setup'
  | 'organization_setup'
  | 'accept_invitation'
  | 'await_role_assignment'
  | 'account_recovery'
  | 'dashboard';
export type AccountStateReason =
  'registration_intent_missing' | 'organization_role_not_assigned' | 'legacy_account_unclassified';
export interface RegistrationIntentResponse {
  readonly intent: RegistrationIntent;
  readonly nextStep?: AccountNextStep;
  readonly onboardingStatus?: OnboardingStatus;
}
export type WorkspaceType = 'personal' | 'organization';
export interface SessionMembership {
  readonly id?: string;
  readonly organizationId?: string;
  readonly organizationName?: string;
  readonly workspaceId?: string;
  readonly workspaceRoles?: readonly UserRole[];
  readonly personas?: readonly ProductPersona[];
  readonly capabilities?: readonly Capability[];
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
  | 'invitation_required'
  | 'account_recovery_required'
  | 'pending_approval';
export interface SessionUser {
  readonly uid: string;
  readonly email?: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
  /** Platform-scoped roles are reported independently from organization memberships. */
  readonly platformRoles?: readonly UserRole[];
  /** Backend-issued account roles before workspace policy is applied. */
  readonly baseRoles?: readonly UserRole[];
  /** Product journeys are independent from workspace governance roles. */
  readonly personas?: readonly ProductPersona[];
  /** Server-derived permissions for the selected workspace. */
  readonly capabilities?: readonly Capability[];
  /** Governance authority for the selected workspace (for example, owner or admin). */
  readonly workspaceRoles?: readonly UserRole[];
  readonly disabled: boolean;
  readonly onboardingStatus: OnboardingStatus;
  readonly nextStep?: AccountNextStep;
  readonly registrationIntent?: RegistrationIntent;
  readonly accountStateReason?: AccountStateReason;
  readonly pendingInvitation?: boolean;
  /** Opaque backend-issued reference suitable for a support request. */
  readonly supportReference?: string;
  readonly memberships: readonly SessionMembership[];
  readonly activeOrganizationId?: string;
  /** Stable identifier for the workspace selected by the backend session. */
  readonly activeWorkspaceId?: string;
  /** The backend-selected workspace. It is context only; effective roles remain authoritative. */
  readonly activeWorkspace?: SessionWorkspace;
  /** Code children enter with their handle and PIN. */
  readonly familyCode?: string;
  readonly workspaces?: readonly SessionWorkspace[];
  /** The backend-calculated authority. It is never derived from memberships in the browser. */
  readonly effectiveRoles?: readonly UserRole[];
  /** Canonical migration signal. Kept top-level for the current session contract. */
  readonly migrationRequired?: boolean;
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
export interface SessionWorkspace {
  readonly type: WorkspaceType;
  readonly id: string;
  readonly name?: string;
  readonly status?: MembershipState;
  readonly roles?: readonly UserRole[];
  /** Human-readable workspace code used for child sign-in. */
  readonly slug?: string;
  readonly familyCode?: string;
}
export interface ClaimSynchronization {
  readonly status: 'synchronized' | 'refresh_required' | 'failed';
  readonly tokenRefreshRequired: boolean;
}
export interface SessionData extends SessionUser {
  /** Optional while older session producers roll out claim synchronization metadata. */
  readonly claimSynchronization?: ClaimSynchronization;
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

export type BibleImportStatus =
  | 'processing'
  | 'needs_review'
  | 'needs_correction'
  | 'draft_created'
  | 'processing_failed'
  | 'rejected'
  | 'committed';

export type BibleImportAction = 'view' | 'review' | 'reject' | 'commit';

export interface BibleImportQuarter {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface BibleImportItem {
  readonly id: string;
  readonly title: string;
  readonly status: BibleImportStatus;
  readonly quarter: BibleImportQuarter;
  readonly questionFilename: string;
  readonly answerKeyFilename: string;
  readonly activityCount: number;
  readonly questionCount: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly committedContentSetId: string | null;
  readonly allowedActions: readonly BibleImportAction[];
}

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total?: number;
  readonly totalItems?: number;
  readonly totalPages?: number;
}

export interface BibleImportsPayload {
  readonly items: readonly BibleImportItem[];
  readonly pagination: Pagination;
}

export interface BibleAdminDashboardData {
  readonly imports: BibleImportsPayload;
  readonly meta?: {
    readonly nextCursor?: string | null;
  };
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
