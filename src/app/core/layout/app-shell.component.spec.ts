import { initialsFor } from './app-shell.component';

describe('application shell utilities', () => {
  it('creates initials from authoritative session display names', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
    expect(initialsFor('  Prince  ')).toBe('P');
    expect(initialsFor('')).toBe('');
  });
});
