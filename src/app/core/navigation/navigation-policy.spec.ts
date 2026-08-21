import { navigationFor } from './navigation-policy';

describe('capability-driven navigation policy', () => {
  const activeMembership = { workspaceId: 'personal-1', workspaceRoles: ['owner'] as const, status: 'active' as const };

  it('shows ordered parent navigation to a personal owner with backend capabilities', () => {
    const paths = navigationFor({
      workspaceType: 'personal',
      membership: activeMembership,
      personas: ['parent'],
      capabilities: [
        'support.requests.create',
        'family.activities.read',
        'parent.observations.create',
        'parent.children.read',
      ],
    }).map((item) => item.route);
    expect(paths).toEqual(['/parent/children', '/parent/observations', '/parent/family', '/parent/academic-support']);
    expect(paths.some((path) => path.startsWith('/admin/'))).toBeFalse();
  });

  it('does not infer parent or admin navigation from workspace ownership', () => {
    expect(
      navigationFor({ workspaceType: 'personal', membership: activeMembership, personas: [], capabilities: [] }),
    ).toEqual([]);
  });

  it('requires an active membership and organization workspace for admin capabilities', () => {
    const context = { personas: [] as const, capabilities: ['admin.quarters.manage'] };
    expect(navigationFor({ ...context, workspaceType: 'personal', membership: activeMembership })).toEqual([]);
    expect(navigationFor({ ...context, workspaceType: 'organization', membership: { status: 'inactive' } })).toEqual(
      [],
    );
    expect(
      navigationFor({ ...context, workspaceType: 'organization', membership: { status: 'active' } }).map(
        (i) => i.route,
      ),
    ).toEqual(['/admin/quarters']);
  });
});
