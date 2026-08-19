import { buildHttpParams } from './http-params';

describe('buildHttpParams', () => {
  it('omits empty, whitespace-only, null, and undefined values', () => {
    const params = buildHttpParams({ empty: '', whitespace: '   ', nil: null, missing: undefined });
    expect(params.keys()).toEqual([]);
  });

  it('retains zero and false', () => {
    const params = buildHttpParams({ page: 0, enabled: false });
    expect(params.get('page')).toBe('0');
    expect(params.get('enabled')).toBe('false');
  });

  it('includes non-empty search and cursor values', () => {
    const params = buildHttpParams({ search: 'Ada', cursor: 'next-42' });
    expect(params.get('search')).toBe('Ada');
    expect(params.get('cursor')).toBe('next-42');
  });
});
