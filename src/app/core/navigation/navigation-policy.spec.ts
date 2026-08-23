import { NavigationContext, navigationFor } from './navigation-policy';

describe('typed role/persona/capability navigation registry', () => {
  const active = { status: 'active' as const, workspaceRoles: [] };
  const routes = (context: Partial<NavigationContext>) =>
    navigationFor({
      workspaceType: 'organization',
      membership: active,
      personas: [],
      capabilities: [],
      ...context,
    }).map((item) => item.route);

  it('shows every enabled organization workflow to a capability-authorized admin', () => {
    expect(
      routes({
        workspaceRoles: ['admin'],
        capabilities: [
          'admin.participants.manage',
          'admin.teams.manage',
          'admin.assignments.manage',
          'admin.quarters.manage',
          'admin.character.manage',
          'admin.bible_content.manage',
          'admin.family_activities.manage',
          'admin.books.manage',
          'admin.projects.manage',
          'admin.surveys.manage',
          'admin.point_rules.manage',
          'admin.reports.read',
          'admin.awards.manage',
        ],
      }),
    ).toEqual([
      '/admin/participants',
      '/admin/teams',
      '/admin/assignments',
      '/admin/quarters',
      '/admin/character',
      '/admin/bible',
      '/admin/family',
      '/admin/books',
      '/admin/projects',
      '/admin/surveys',
      '/admin/points',
      '/admin/reports',
      '/admin/awards',
    ]);
  });

  it('does not infer admin authority from ownership', () => {
    expect(routes({ workspaceRoles: ['owner'], capabilities: ['admin.quarters.manage'] })).toEqual([]);
  });

  it('adds only capability-authorized tenant administration for super admin', () => {
    expect(
      routes({
        platformRoles: ['super_admin'],
        capabilities: [
          'platform.organizations.manage',
          'platform.memberships.manage',
          'platform.roles.read',
          'platform.audit.read',
        ],
      }),
    ).toEqual(['/admin/organizations', '/admin/users', '/admin/memberships', '/admin/roles', '/admin/audit']);
  });

  it('restores complete child, mentor, and observer menus from persona boundaries', () => {
    const personal = { workspaceType: 'personal' as const };
    expect(routes({ ...personal, personas: ['child'] })).toHaveSize(9);
    expect(routes({ ...personal, personas: ['mentor'] })).toEqual([
      '/mentor/teams',
      '/mentor/projects',
      '/mentor/reading',
      '/mentor/encouragement',
      '/mentor/notifications',
    ]);
    expect(routes({ ...personal, personas: ['observer'] })).toEqual(['/observer/observations']);
  });

  it('requires parent capabilities only where the published contract requires them', () => {
    expect(
      routes({
        workspaceType: 'personal',
        personas: ['parent'],
        capabilities: [
          'parent.children.read',
          'parent.observations.create',
          'family.activities.read',
          'support.requests.create',
          'parent.notifications.read',
          'parent.reports.read',
        ],
      }),
    ).toHaveSize(8);
  });

  it('renders nothing before an active membership is available', () => {
    expect(
      navigationFor({ workspaceType: 'organization', membership: null, personas: ['child'], capabilities: [] }),
    ).toEqual([]);
  });
});
