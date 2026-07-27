import {
  decryptField,
  encryptField,
  FIELD_CIPHER_PREFIX,
  generateDek,
  isEncryptedEnvelope,
  parseMasterKey,
  unwrapDek,
  wrapDek,
} from './field-cipher';
import {
  EMERGENCY_PHI_FIELDS,
  PROFILE_PHI_FIELDS,
} from '../../common/src/phi/phi-fields';

describe('field-cipher', () => {
  const dek = generateDek();

  it('round-trips plaintext', () => {
    const cipher = encryptField('1990-01-15', dek);
    expect(cipher.startsWith(FIELD_CIPHER_PREFIX)).toBe(true);
    expect(decryptField(cipher, dek)).toBe('1990-01-15');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encryptField('O+', dek);
    const b = encryptField('O+', dek);
    expect(a).not.toEqual(b);
    expect(decryptField(a, dek)).toBe('O+');
    expect(decryptField(b, dek)).toBe('O+');
  });

  it('passes through legacy plaintext envelopes', () => {
    expect(isEncryptedEnvelope('plain-dob')).toBe(false);
    expect(decryptField('plain-dob', dek)).toBe('plain-dob');
  });

  it('wraps and unwraps a DEK with the master key', () => {
    const master = parseMasterKey(
      Buffer.from('0123456789abcdef0123456789abcdef').toString('base64'),
    );
    const wrapped = wrapDek(dek, master);
    expect(isEncryptedEnvelope(wrapped)).toBe(true);
    expect(unwrapDek(wrapped, master).equals(dek)).toBe(true);
  });

  it('rejects invalid master key lengths', () => {
    expect(() => parseMasterKey('too-short')).toThrow(/32-byte/);
  });
});

describe('PHI field maps', () => {
  it('includes the agreed profile PHI columns', () => {
    expect(PROFILE_PHI_FIELDS).toEqual(
      expect.arrayContaining([
        'date_of_birth',
        'national_id',
        'phone',
        'address_line',
        'city',
        'postal_code',
        'state',
        'gender',
        'marital_status',
      ]),
    );
    expect(PROFILE_PHI_FIELDS).toHaveLength(9);
  });

  it('includes the agreed emergency PHI columns', () => {
    expect(EMERGENCY_PHI_FIELDS).toEqual(
      expect.arrayContaining([
        'blood_group',
        'genotype',
        'allergies',
        'current_medications',
        'chronic_conditions',
        'emergency_contacts',
        'preferred_hospital',
        'insurance_provider',
        'notes',
      ]),
    );
    expect(EMERGENCY_PHI_FIELDS).toHaveLength(9);
  });
});

describe('mini-app PHI path maps', () => {
  // Imported via sibling module to avoid jose ESM in the common barrel under Jest.
  const { MINI_APP_PHI_PATHS } = require('../../common/src/phi/mini-app-phi') as {
    MINI_APP_PHI_PATHS: Record<string, readonly string[]>;
  };

  it('covers all six mini-app keys', () => {
    expect(Object.keys(MINI_APP_PHI_PATHS).sort()).toEqual(
      ['checkup', 'immunization', 'medication', 'period', 'pregnancy', 'vitals'].sort(),
    );
  });
});
