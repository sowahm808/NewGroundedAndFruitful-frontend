import { Capability, ProductPersona, SessionMembership, WorkspaceType } from '../models/domain.models';

export interface NavigationPolicy {
  readonly label: string;
  readonly route: string;
  readonly requiredCapabilities: readonly Capability[];
  readonly allowedWorkspaceTypes: readonly WorkspaceType[];
  readonly featureFlag: 'published';
  readonly order: number;
}

const both: readonly WorkspaceType[] = ['personal', 'organization'];

/** Routes in this registry are mounted and included in the frontend OpenAPI contract check. */
export const NAVIGATION_POLICIES: readonly NavigationPolicy[] = [
  {
    label: 'Children',
    route: '/parent/children',
    requiredCapabilities: ['parent.children.read'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 100,
  },
  {
    label: 'Observations',
    route: '/parent/observations',
    requiredCapabilities: ['parent.observations.create'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 110,
  },
  {
    label: 'Family activities',
    route: '/parent/family',
    requiredCapabilities: ['family.activities.read'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 120,
  },
  {
    label: 'Support requests',
    route: '/parent/academic-support',
    requiredCapabilities: ['support.requests.create'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 130,
  },
  {
    label: 'Reports',
    route: '/parent/reports',
    requiredCapabilities: ['parent.reports.read'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 140,
  },
  {
    label: 'Notifications',
    route: '/parent/notifications',
    requiredCapabilities: ['parent.notifications.read'],
    allowedWorkspaceTypes: both,
    featureFlag: 'published',
    order: 150,
  },
  {
    label: 'Quarters',
    route: '/admin/quarters',
    requiredCapabilities: ['admin.quarters.manage'],
    allowedWorkspaceTypes: ['organization'],
    featureFlag: 'published',
    order: 400,
  },
  {
    label: 'Bible',
    route: '/admin/bible',
    requiredCapabilities: ['admin.bible_content.manage'],
    allowedWorkspaceTypes: ['organization'],
    featureFlag: 'published',
    order: 410,
  },
];

export interface NavigationContext {
  readonly workspaceType?: WorkspaceType;
  readonly membership?: SessionMembership | null;
  readonly personas: readonly ProductPersona[];
  readonly capabilities: readonly Capability[];
}

export function navigationFor(context: NavigationContext): readonly NavigationPolicy[] {
  if (!context.workspaceType || context.membership?.status !== 'active') return [];
  const granted = new Set(context.capabilities);
  return NAVIGATION_POLICIES.filter(
    (item) =>
      item.featureFlag === 'published' &&
      item.allowedWorkspaceTypes.includes(context.workspaceType!) &&
      item.requiredCapabilities.every((capability) => granted.has(capability)),
  ).sort((left, right) => left.order - right.order);
}

export function hasCapabilities(granted: readonly Capability[], required: readonly Capability[]): boolean {
  return required.every((capability) => granted.includes(capability));
}
