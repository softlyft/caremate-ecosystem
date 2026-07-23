import {
  emailLocalPart,
  isWeakDisplayName,
  preferDisplayName,
  resolveAccountDisplayName,
  resolveAccountFirstName,
} from '@/domains/profile/display-name';

describe('display-name', () => {
  test('emailLocalPart extracts the local segment', () => {
    expect(emailLocalPart('loveu@example.com')).toBe('loveu');
    expect(emailLocalPart('  Ada@Host ')).toBe('Ada');
    expect(emailLocalPart(null)).toBe('');
    expect(emailLocalPart('nope')).toBe('');
  });

  test('treats email local-part stubs as weak names', () => {
    expect(isWeakDisplayName('loveu', 'loveu@example.com')).toBe(true);
    expect(isWeakDisplayName('LoveU', 'loveu@example.com')).toBe(true);
    expect(isWeakDisplayName('loveu@example.com', 'loveu@example.com')).toBe(true);
    expect(isWeakDisplayName('Fun', 'loveu@example.com')).toBe(false);
    expect(isWeakDisplayName('Fun Last', 'loveu@example.com')).toBe(false);
    expect(isWeakDisplayName('  ', 'loveu@example.com')).toBe(true);
  });

  test('prefers registered / emergency names over email stubs', () => {
    expect(
      resolveAccountDisplayName({
        profileFullName: 'loveu',
        emergencyFullName: 'Fun Last',
        email: 'loveu@example.com',
      }),
    ).toBe('Fun Last');

    expect(
      resolveAccountDisplayName({
        profileFullName: 'Fun Last',
        emergencyFullName: 'loveu',
        email: 'loveu@example.com',
      }),
    ).toBe('Fun Last');

    expect(
      resolveAccountDisplayName({
        profileFullName: 'loveu',
        emergencyFullName: '',
        authFullName: 'Fun Last',
        email: 'loveu@example.com',
      }),
    ).toBe('Fun Last');
  });

  test('falls back cleanly when only a weak name exists', () => {
    expect(
      preferDisplayName(['loveu'], { email: 'loveu@example.com', fallback: 'CareMate User' }),
    ).toBe('loveu');
    expect(preferDisplayName([], { fallback: 'CareMate User' })).toBe('CareMate User');
  });

  test('first name greeting skips email stubs', () => {
    expect(
      resolveAccountFirstName({
        profileFullName: 'loveu',
        emergencyFullName: 'Fun Last',
        email: 'loveu@example.com',
      }),
    ).toBe('Fun');

    expect(
      resolveAccountFirstName({
        profileFullName: 'loveu',
        email: 'loveu@example.com',
      }),
    ).toBeNull();
  });
});
