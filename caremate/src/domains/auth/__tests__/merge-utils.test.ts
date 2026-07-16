import { preferList, preferText } from '@/domains/auth/merge-utils';

describe('guest migration merge helpers', () => {
  it('preferText keeps non-empty primary values', () => {
    expect(preferText('Account', 'Guest')).toBe('Account');
    expect(preferText('  ', 'Guest')).toBe('Guest');
    expect(preferText(null, 'Guest')).toBe('Guest');
    expect(preferText(null, null)).toBeNull();
  });

  it('preferList keeps non-empty primary lists', () => {
    expect(preferList(['a'], ['b'])).toEqual(['a']);
    expect(preferList([], ['b'])).toEqual(['b']);
    expect(preferList(undefined, undefined)).toEqual([]);
  });
});
