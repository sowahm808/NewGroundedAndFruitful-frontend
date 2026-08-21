import { UserRole } from '../models/domain.models';

const canonicalRoles: readonly UserRole[] = ['owner', 'child', 'parent', 'mentor', 'observer', 'admin', 'super_admin'];
const aliases: Readonly<Record<string, UserRole>> = {
  owner: 'owner',
  child: 'child',
  participant: 'child',
  parent: 'parent',
  guardian: 'parent',
  mentor: 'mentor',
  observer: 'observer',
  authorizedadult: 'observer',
  admin: 'admin',
  administrator: 'admin',
  superadmin: 'super_admin',
};

/** Normalize role spellings only while translating the backend API response. */
export function normalizeRoles(value: unknown): readonly UserRole[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\s,]+/) : [];
  const found = new Set<UserRole>();
  for (const candidate of values) {
    if (typeof candidate !== 'string') continue;
    const key = candidate.trim().toLowerCase().replace(/[_-]/g, '');
    const role = aliases[key];
    if (role) found.add(role);
  }
  return canonicalRoles.filter((role) => found.has(role));
}

export function roleDestination(roles: readonly UserRole[]): string | null {
  if (roles.includes('super_admin')) return '/admin/users';
  if (roles.includes('admin')) return '/admin/quarters';
  if (roles.includes('mentor')) return '/mentor/teams';
  if (roles.includes('parent')) return '/parent/children';
  if (roles.includes('observer')) return '/observer/observations';
  if (roles.includes('child')) return '/child/today';
  return null;
}

export function roleCanAccessPath(roles: readonly UserRole[], path: string): boolean {
  const segment = path.split(/[?#]/, 1)[0].split('/')[1];
  if (segment === 'admin') return roles.includes('admin') || roles.includes('super_admin');
  if (segment === 'mentor') return roles.includes('mentor');
  if (segment === 'parent') return roles.includes('parent') || roles.includes('owner');
  if (segment === 'observer') return roles.includes('observer');
  if (segment === 'child') return roles.includes('child');
  return true;
}
