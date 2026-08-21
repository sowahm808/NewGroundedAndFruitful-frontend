import { initialsFor, navigationFor } from './app-shell.component';

describe('application shell utilities', () => {
  it('creates initials from authoritative session display names', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
    expect(initialsFor('  Prince  ')).toBe('P');
    expect(initialsFor('')).toBe('');
  });
});

describe('authoritative navigation roles', () => {
  it('shows platform and organization administration for a super-admin with active organization authority', () => {
    const paths = navigationFor(['super_admin', 'admin'], ['admin']).map((item) => item.path);
    expect(paths).toContain('/admin/organizations');
    expect(paths).toContain('/admin/quarters');
  });

  it('does not grant super-admin navigation to an organization admin', () => {
    const paths = navigationFor(['admin'], ['admin']).map((item) => item.path);
    expect(paths).toContain('/admin/quarters');
    expect(paths).not.toContain('/admin/organizations');
    expect(paths).not.toContain('/admin/audit');
  });

  it('updates from refreshed effective roles and rejects organization authority absent from the session', () => {
    expect(navigationFor(['admin'], []).map((item) => item.path)).not.toContain('/admin/quarters');
    expect(navigationFor(['super_admin'], []).map((item) => item.path)).toContain('/admin/organizations');
  });
});
