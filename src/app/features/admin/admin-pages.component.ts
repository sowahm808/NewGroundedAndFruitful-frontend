import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminResourceComponent, AdminResourceDefinition } from './admin-resource.component';

const COMMON_SORTS = [
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'label', label: 'Name A–Z' },
] as const;
const STANDARD_ACTIONS = {
  activate: { label: 'Activate', consequence: 'This makes the record available in its authorized program scope.' },
  archive: {
    label: 'Archive',
    consequence: 'This removes the record from active workflows without deleting its history.',
  },
  suspend: { label: 'Suspend', consequence: 'This immediately removes the record’s active access.' },
  restore: { label: 'Restore', consequence: 'This returns the archived record to its prior lifecycle.' },
} as const;

export const ADMIN_RESOURCES: Readonly<Record<string, AdminResourceDefinition>> = {
  users: definition(
    'users',
    'Users',
    'Review identities and server-authorized account lifecycle commands.',
    ['active', 'disabled', 'pending'],
    { ...STANDARD_ACTIONS },
  ),
  organizations: definition(
    'organizations',
    'Organizations',
    'Manage tenant organizations and their lifecycle.',
    ['active', 'suspended', 'archived'],
    { ...STANDARD_ACTIONS },
  ),
  memberships: definition(
    'memberships',
    'Memberships',
    'Review program access, approval, and suspension.',
    ['pending', 'active', 'suspended'],
    {
      approve: {
        label: 'Approve',
        consequence: 'This grants the membership access permitted by its server-owned roles.',
      },
      ...STANDARD_ACTIONS,
    },
  ),
  roles: definition(
    'roles',
    'Roles',
    'Review role definitions and lifecycle; grants remain enforced by the API.',
    ['active', 'retired'],
    { ...STANDARD_ACTIONS },
  ),
  participants: definition(
    'participants',
    'Participants',
    'Manage participant enrollment without exposing private journey content.',
    ['pending', 'active', 'withdrawn'],
    { ...STANDARD_ACTIONS },
  ),
  teams: definition(
    'teams',
    'Teams',
    'Manage team rosters and lifecycle within authorized scopes.',
    ['draft', 'active', 'completed', 'archived'],
    { ...STANDARD_ACTIONS },
  ),
  assignments: definition(
    'assignments',
    'Assignments',
    'Schedule and publish program assignments.',
    ['draft', 'scheduled', 'published', 'closed', 'archived'],
    {
      publish: { label: 'Publish', consequence: 'This exposes the assignment to eligible participants.' },
      close: { label: 'Close', consequence: 'This stops new participant submissions.' },
      ...STANDARD_ACTIONS,
    },
  ),
  quarters: definition(
    'quarters',
    'Quarters',
    'Configure program periods and explicit lifecycle transitions.',
    ['draft', 'scheduled', 'active', 'closed', 'archived'],
    {
      activate: STANDARD_ACTIONS.activate,
      close: { label: 'Close', consequence: 'This ends active quarter participation and cannot be silently undone.' },
      archive: STANDARD_ACTIONS.archive,
    },
  ),
  character: definition(
    'character-cycles',
    'Character qualities & cycles',
    'Configure qualities and the cycles in which they are presented.',
    ['draft', 'scheduled', 'active', 'completed', 'archived'],
    {
      publish: { label: 'Publish', consequence: 'This makes the configured cycle visible to eligible participants.' },
      ...STANDARD_ACTIONS,
    },
  ),
  bible: definition(
    'bible-content',
    'Bible content',
    'Publish curated Bible activities through the server contract.',
    ['draft', 'published', 'retired'],
    {
      publish: { label: 'Publish', consequence: 'This makes this content available in assigned journeys.' },
      ...STANDARD_ACTIONS,
    },
  ),
  family: definition(
    'family-activities',
    'Family activities',
    'Schedule family activities for authorized program scopes.',
    ['draft', 'scheduled', 'active', 'closed'],
    {
      publish: { label: 'Publish', consequence: 'This makes the activity available to eligible families.' },
      close: { label: 'Close', consequence: 'This closes the activity to new completion.' },
      ...STANDARD_ACTIONS,
    },
  ),
  books: definition(
    'books',
    'Books & reading assignments',
    'Manage the reading catalog and assigned reading windows.',
    ['draft', 'scheduled', 'published', 'retired'],
    {
      publish: {
        label: 'Publish',
        consequence: 'This publishes the book or reading assignment to its eligible scope.',
      },
      ...STANDARD_ACTIONS,
    },
  ),
  projects: definition(
    'projects',
    'Projects',
    'Oversee only projects the backend authorizes for your scope.',
    ['proposed', 'approved', 'active', 'completed', 'archived'],
    {
      approve: { label: 'Approve', consequence: 'This advances the project into its server-controlled workflow.' },
      archive: STANDARD_ACTIONS.archive,
    },
  ),
  special: definition(
    'special-activities',
    'Special activities',
    'Configure eligibility and participation windows for special activities.',
    ['draft', 'scheduled', 'active', 'closed', 'archived'],
    {
      publish: { label: 'Publish', consequence: 'This makes the activity available to its eligible scope.' },
      ...STANDARD_ACTIONS,
    },
  ),
  observations: definition(
    'observations',
    'Observation moderation',
    'Review observations in the scope authorized by the server without exposing private journey data.',
    ['pending', 'approved', 'rejected'],
    {
      approve: {
        label: 'Approve observation',
        consequence: 'This publishes the observation to its authorized recipients.',
      },
      reject: {
        label: 'Reject observation',
        consequence: 'This rejects the observation while retaining its moderation history.',
      },
    },
  ),
  incidents: definition(
    'incidents',
    'Incidents',
    'Review restricted incident records. Access and every privileged read are enforced and audited by the server.',
    ['open', 'investigating', 'resolved', 'closed'],
    {
      investigate: {
        label: 'Begin investigation',
        consequence: 'This records you as beginning a restricted investigation.',
      },
      resolve: {
        label: 'Resolve incident',
        consequence: 'This records the incident as resolved without deleting its history.',
      },
      close: {
        label: 'Close incident',
        consequence: 'This closes the incident while retaining its immutable history.',
      },
    },
  ),
  surveys: definition(
    'surveys',
    'Surveys',
    'Manage privacy-noticed surveys and response windows.',
    ['draft', 'scheduled', 'open', 'closed', 'archived'],
    {
      open: { label: 'Open', consequence: 'This begins accepting eligible survey responses.' },
      close: { label: 'Close', consequence: 'This stops new survey responses.' },
      ...STANDARD_ACTIONS,
    },
  ),
  points: definition(
    'point-rules',
    'Point rules',
    'Configure versioned, backend-calculated participation rules.',
    ['draft', 'active', 'retired'],
    {
      activate: {
        label: 'Activate rule version',
        consequence: 'This changes which server-owned rule version applies to future eligible events.',
      },
      archive: STANDARD_ACTIONS.archive,
    },
  ),
  reports: definition(
    'reports',
    'Reports',
    'Run and review privacy-scoped report jobs prepared by the server.',
    ['queued', 'running', 'ready', 'expired', 'failed'],
    {
      run: { label: 'Run report', consequence: 'This starts a scoped report job and records an audit event.' },
      expire: { label: 'Expire', consequence: 'This removes access to the generated report artifact.' },
    },
  ),
  awards: definition(
    'awards',
    'Awards',
    'Review backend-issued awards and authorized revocations.',
    ['issued', 'revoked'],
    {
      revoke: { label: 'Revoke', consequence: 'This revokes the award while retaining its immutable history.' },
      restore: STANDARD_ACTIONS.restore,
    },
  ),
  audit: definition(
    'audit',
    'Audit',
    'Review immutable privileged activity within your server-authorized scope.',
    ['success', 'denied', 'failed'],
    {},
  ),
};

function definition(
  resource: string,
  title: string,
  description: string,
  statuses: readonly string[],
  actions: AdminResourceDefinition['actions'],
): AdminResourceDefinition {
  return { resource, title, description, statuses, sorts: COMMON_SORTS, actions };
}

@Component({
  standalone: true,
  imports: [AdminResourceComponent],
  template: `<gf-admin-resource [definition]="definition" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly definition = ADMIN_RESOURCES[this.route.snapshot.data['resource'] as string];
}
