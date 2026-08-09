import { extractRoles } from './auth.service';

describe('extractRoles', () => {
  it('reads roles from array, string, and boolean custom-claim formats', () => {
    expect(extractRoles({ roles: ['parent', 'not-a-role'], role: 'mentor' })).toEqual(['parent', 'mentor']);
    expect(extractRoles({ roles: 'admin super_admin' })).toEqual(['admin', 'super_admin']);
    expect(extractRoles({ parent: true, roles: { observer: true, mentor: false } })).toEqual(['parent', 'observer']);
  });
});
