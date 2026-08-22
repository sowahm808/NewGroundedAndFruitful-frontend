import { Capability, ProductPersona, SessionMembership, UserRole, WorkspaceType } from '../models/domain.models';

export type NavigationGroup = ProductPersona | 'admin' | 'super_admin';
export type FeatureStatus = 'enabled' | 'planned';

/** Product-owned navigation registry. Routes are never discovered from the Angular router. */
export interface NavigationPolicy {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly group: NavigationGroup;
  readonly requiredCapabilities: readonly Capability[];
  readonly allowedWorkspaceTypes: readonly WorkspaceType[];
  readonly requiredWorkspaceRoles?: readonly UserRole[];
  readonly requiredPlatformRoles?: readonly UserRole[];
  readonly featureStatus: FeatureStatus;
  readonly order: number;
}

const both: readonly WorkspaceType[] = ['personal', 'organization'];
const child = (id: string, label: string, route: string, order: number): NavigationPolicy => ({
  id,
  label,
  route,
  group: 'child',
  requiredCapabilities: [],
  allowedWorkspaceTypes: both,
  featureStatus: 'enabled',
  order,
});
const persona = (
  group: ProductPersona,
  id: string,
  label: string,
  route: string,
  order: number,
  capabilities: readonly Capability[] = [],
): NavigationPolicy => ({
  id,
  label,
  route,
  group,
  requiredCapabilities: capabilities,
  allowedWorkspaceTypes: both,
  featureStatus: 'enabled',
  order,
});
const admin = (id: string, label: string, route: string, order: number, capability: Capability): NavigationPolicy => ({
  id,
  label,
  route,
  group: 'admin',
  requiredCapabilities: [capability],
  requiredWorkspaceRoles: ['admin'],
  allowedWorkspaceTypes: ['organization'],
  featureStatus: 'enabled',
  order,
});
const platform = (
  id: string,
  label: string,
  route: string,
  order: number,
  capability: Capability,
): NavigationPolicy => ({
  id,
  label,
  route,
  group: 'super_admin',
  requiredCapabilities: [capability],
  requiredPlatformRoles: ['super_admin'],
  allowedWorkspaceTypes: ['organization'],
  featureStatus: 'enabled',
  order,
});

export const NAVIGATION_POLICIES: readonly NavigationPolicy[] = [
  child('child-today', 'Today', '/child/today', 10),
  child('child-check-in', 'Check-in', '/child/check-in', 20),
  child('child-gratitude', 'Gratitude', '/child/gratitude', 30),
  child('child-character', 'Character', '/child/character', 40),
  child('child-bible', 'Bible', '/child/bible', 50),
  child('child-reading', 'Reading', '/child/reading', 60),
  child('child-project', 'Project', '/child/project', 70),
  child('child-team', 'Team', '/child/team', 80),
  child('child-more', 'More', '/child/more', 90),
  persona('parent', 'parent-children', 'Children', '/parent/children', 100, ['parent.children.read']),
  persona('parent', 'parent-character', 'Character', '/parent/character', 110),
  persona('parent', 'parent-observations', 'Observations', '/parent/observations', 120, ['parent.observations.create']),
  persona('parent', 'parent-family', 'Family activities', '/parent/family', 130, ['family.activities.read']),
  persona('parent', 'parent-support', 'Support requests', '/parent/academic-support', 140, ['support.requests.create']),
  persona('parent', 'parent-participation', 'Participation', '/parent/participation', 150),
  persona('parent', 'parent-notifications', 'Notifications', '/parent/notifications', 160, [
    'parent.notifications.read',
  ]),
  persona('parent', 'parent-reports', 'Reports', '/parent/reports', 170, ['parent.reports.read']),
  persona('mentor', 'mentor-teams', 'Teams', '/mentor/teams', 200),
  persona('mentor', 'mentor-projects', 'Projects', '/mentor/projects', 210),
  persona('mentor', 'mentor-reading', 'Reading', '/mentor/reading', 220),
  persona('mentor', 'mentor-encouragement', 'Encouragement', '/mentor/encouragement', 230),
  persona('observer', 'observer-observations', 'Observations', '/observer/observations', 300),
  admin('admin-participants', 'Participants', '/admin/participants', 400, 'admin.participants.manage'),
  admin('admin-teams', 'Teams', '/admin/teams', 410, 'admin.teams.manage'),
  admin('admin-assignments', 'Assignments', '/admin/assignments', 420, 'admin.assignments.manage'),
  admin('admin-quarters', 'Quarters', '/admin/quarters', 430, 'admin.quarters.manage'),
  admin('admin-character', 'Character', '/admin/character', 440, 'admin.character.manage'),
  admin('admin-bible', 'Bible', '/admin/bible', 450, 'admin.bible_content.manage'),
  admin('admin-family', 'Family activities', '/admin/family', 460, 'admin.family_activities.manage'),
  admin('admin-books', 'Books', '/admin/books', 470, 'admin.books.manage'),
  admin('admin-projects', 'Projects', '/admin/projects', 480, 'admin.projects.manage'),
  admin('admin-surveys', 'Surveys', '/admin/surveys', 490, 'admin.surveys.manage'),
  admin('admin-points', 'Point rules', '/admin/points', 500, 'admin.point_rules.manage'),
  admin('admin-reports', 'Reports', '/admin/reports', 510, 'admin.reports.read'),
  admin('admin-awards', 'Awards', '/admin/awards', 520, 'admin.awards.manage'),
  platform('platform-organizations', 'Organizations', '/admin/organizations', 600, 'platform.organizations.manage'),
  platform('platform-users', 'Users', '/admin/users', 610, 'platform.memberships.manage'),
  platform('platform-memberships', 'Memberships', '/admin/memberships', 620, 'platform.memberships.manage'),
  platform('platform-roles', 'Roles', '/admin/roles', 630, 'platform.roles.read'),
  platform('platform-audit', 'Audit', '/admin/audit', 640, 'platform.audit.read'),
];

export interface NavigationContext {
  readonly workspaceType?: WorkspaceType;
  readonly membership?: SessionMembership | null;
  readonly personas: readonly ProductPersona[];
  readonly capabilities: readonly Capability[];
  readonly workspaceRoles?: readonly UserRole[];
  readonly platformRoles?: readonly UserRole[];
}

export function navigationFor(context: NavigationContext): readonly NavigationPolicy[] {
  if (!context.workspaceType || context.membership?.status !== 'active') return [];
  const granted = new Set(context.capabilities);
  const personas = new Set(context.personas);
  const workspaceRoles = new Set(context.workspaceRoles ?? context.membership.workspaceRoles ?? []);
  const platformRoles = new Set(context.platformRoles ?? []);
  return NAVIGATION_POLICIES.filter((item) => {
    if (item.featureStatus !== 'enabled' || !item.allowedWorkspaceTypes.includes(context.workspaceType!)) return false;
    if (item.group === 'admin' && !item.requiredWorkspaceRoles?.some((role) => workspaceRoles.has(role))) return false;
    if (item.group === 'super_admin' && !item.requiredPlatformRoles?.some((role) => platformRoles.has(role)))
      return false;
    if (item.group !== 'admin' && item.group !== 'super_admin' && !personas.has(item.group)) return false;
    return item.requiredCapabilities.every((capability) => granted.has(capability));
  }).sort((left, right) => left.order - right.order);
}

export function hasCapabilities(granted: readonly Capability[], required: readonly Capability[]): boolean {
  return required.every((capability) => granted.includes(capability));
}
