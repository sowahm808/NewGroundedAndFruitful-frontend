import { normalizeRoles, roleDestination } from './role.utilities';

describe('backend role boundary', () => {
  it('normalizes every legacy alias and rejects unknown values', () => {
    expect(
      normalizeRoles([
        ' participant ',
        'guardian',
        'authorizedAdult',
        'authorized_adult',
        'authorized-adult',
        'administrator',
        'superAdmin',
        'super-admin',
        'OWNER',
        'parent',
      ]),
    ).toEqual(['child', 'parent', 'observer', 'admin', 'super_admin']);
  });

  it('selects every canonical destination with deterministic privilege priority', () => {
    expect(roleDestination(['child'])).toBe('/child/today');
    expect(roleDestination(['parent'])).toBe('/parent/children');
    expect(roleDestination(['mentor'])).toBe('/mentor/teams');
    expect(roleDestination(['observer'])).toBe('/observer/observations');
    expect(roleDestination(['admin'])).toBe('/admin/users');
    expect(roleDestination(['super_admin'])).toBe('/admin/users');
    expect(roleDestination(['child', 'parent', 'mentor'])).toBe('/mentor/teams');
    expect(roleDestination([])).toBeNull();
  });
});
