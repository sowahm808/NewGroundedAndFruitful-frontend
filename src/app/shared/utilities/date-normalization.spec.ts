import { normalizeDate } from './date-normalization';

describe('normalizeDate', () => {
  it('converts Firestore timestamps including nanoseconds', () => {
    expect(normalizeDate({ _seconds: 1_787_108_713, _nanoseconds: 966_000_000 })?.toISOString()).toBe(
      '2026-08-19T03:05:13.966Z',
    );
  });

  it('accepts ISO strings and Dates', () => {
    expect(normalizeDate('2026-08-19T03:05:13.966Z')?.getTime()).toBe(1_787_108_713_966);
    expect(normalizeDate(new Date(1_787_108_713_966))?.getTime()).toBe(1_787_108_713_966);
  });

  it('returns null for missing and invalid values', () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate('not a date')).toBeNull();
    expect(normalizeDate({ _seconds: 1, _nanoseconds: -1 })).toBeNull();
  });
});
