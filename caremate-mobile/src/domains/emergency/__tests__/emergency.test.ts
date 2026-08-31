import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BLOOD_GROUPS,
  GENOTYPES,
  joinFullName,
  splitFullName,
} from '@/domains/emergency/constants';
import {
  buildEmergencyLockSnapshot,
  isEmergencyLockSurfaceEnabled,
  readEmergencyLockSnapshot,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
} from '@/domains/emergency/lock-surface';
import {
  hasRequiredIceContact,
  isCompleteIceContact,
  isValidIcePhone,
  isValidPersonName,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '@/domains/emergency/validation';
import type { EmergencyProfile } from '@/types';

function makeProfile(overrides: Partial<EmergencyProfile> = {}): EmergencyProfile {
  return {
    id: 'ep-1',
    userId: 'user-1',
    fullName: 'Ada Lovelace',
    photoUrl: null,
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: ['Penicillin', 'Peanuts', 'Dust', 'Latex'],
    currentMedications: [],
    chronicConditions: [],
    emergencyContacts: [
      {
        name: 'Charles Babbage',
        phone: '+2348012345678',
        relationship: 'Spouse',
      },
    ],
    preferredHospital: null,
    insuranceProvider: null,
    notes: null,
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('emergency/constants', () => {
  it('lists blood groups and genotypes', () => {
    expect(BLOOD_GROUPS).toContain('AB-');
    expect(GENOTYPES).toContain('AS');
  });

  it('splits and joins full names', () => {
    expect(splitFullName('  Ada  Byron  Lovelace  ')).toEqual({
      firstName: 'Ada',
      lastName: 'Byron Lovelace',
    });
    expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
    expect(joinFullName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(joinFullName('Ada', '  ')).toBe('Ada');
  });
});

describe('emergency/validation', () => {
  it('sanitizes pasted phone input by stripping letters and capping length', () => {
    expect(sanitizePhoneInput('abc+234 801 234 5678xyz')).toBe('+2348012345678');
    expect(sanitizePhoneInput('Call +1 (800) HELP-99')).toBe('+180099');
    expect(sanitizePhoneInput('++2348012345678')).toBe('+2348012345678');
    expect(sanitizePhoneInput('1'.repeat(40))).toBe('1'.repeat(15));
    expect(sanitizePhoneInput(`+${'1'.repeat(20)}`)).toBe(`+${'1'.repeat(15)}`);
    expect(sanitizePhoneInput('call me')).toBe('');
  });

  it('validates phone digit length between 7 and 15', () => {
    expect(isValidIcePhone('+2348012345678')).toBe(true);
    expect(isValidIcePhone('08012345678')).toBe(true);
    expect(isValidIcePhone('(080) 1234-5678')).toBe(false);
    expect(isValidIcePhone('+1')).toBe(false);
    expect(isValidIcePhone('123456')).toBe(false);
    expect(isValidIcePhone('1'.repeat(16))).toBe(false);
    expect(isValidIcePhone('call me')).toBe(false);
    expect(isValidIcePhone('  ')).toBe(false);
  });

  it('sanitizes person names by stripping digits and symbols', () => {
    expect(sanitizePersonNameInput('Ada  Lovelace!!!')).toBe('Ada Lovelace');
    expect(sanitizePersonNameInput("Mary-Jane O'Brien 123")).toBe("Mary-Jane O'Brien ");
    expect(sanitizePersonNameInput('🚀Ada@Softlyft')).toBe('AdaSoftlyft');
    expect(sanitizePersonNameInput('A'.repeat(50))).toHaveLength(40);
  });

  it('validates person names require letters only with limited punctuation', () => {
    expect(isValidPersonName('Ada')).toBe(true);
    expect(isValidPersonName("O'Brien")).toBe(true);
    expect(isValidPersonName('Mary-Jane')).toBe(true);
    expect(isValidPersonName('José')).toBe(true);
    expect(isValidPersonName('123')).toBe(false);
    expect(isValidPersonName('Ada@Home')).toBe(false);
    expect(isValidPersonName('   ')).toBe(false);
  });

  it('requires name, valid phone, and relationship for a complete ICE contact', () => {
    expect(
      isCompleteIceContact({ name: 'Ada', phone: '+2348012345678', relationship: 'Friend' }),
    ).toBe(true);
    expect(isCompleteIceContact({ name: 'Ada', phone: '+1', relationship: 'Friend' })).toBe(false);
    expect(isCompleteIceContact({ name: 'Ada', phone: '  ', relationship: 'Friend' })).toBe(false);
    expect(
      hasRequiredIceContact([
        { name: '', phone: '+2348012345678', relationship: 'Friend' },
        { name: 'Ada', phone: '+2348012345678', relationship: 'Friend' },
      ]),
    ).toBe(true);
    expect(hasRequiredIceContact([])).toBe(false);
  });
});

describe('emergency/lock-surface', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('builds a lock snapshot from the profile with capped allergies', () => {
    const snapshot = buildEmergencyLockSnapshot(makeProfile());
    expect(snapshot.hasProfile).toBe(true);
    expect(snapshot.fullName).toBe('Ada Lovelace');
    expect(snapshot.bloodGroup).toBe('O+');
    expect(snapshot.allergies).toBe('Penicillin, Peanuts, Dust');
    expect(snapshot.contactName).toBe('Charles Babbage');
    expect(snapshot.contactPhone).toBe('+2348012345678');
  });

  it('builds an empty snapshot when profile is missing or unnamed', () => {
    expect(buildEmergencyLockSnapshot(null).hasProfile).toBe(false);
    expect(buildEmergencyLockSnapshot(makeProfile({ fullName: '   ' })).fullName).toBe(
      'CareMate user',
    );
  });

  it('defaults lock surface to disabled and ignores enable attempts', async () => {
    await expect(isEmergencyLockSurfaceEnabled()).resolves.toBe(false);
    await setEmergencyLockSurfaceEnabled(true);
    await expect(isEmergencyLockSurfaceEnabled()).resolves.toBe(false);
  });

  it('reads empty snapshot when storage is empty or corrupt', async () => {
    await expect(readEmergencyLockSnapshot()).resolves.toMatchObject({ hasProfile: false });
    await AsyncStorage.setItem('caremate_emergency_lock_snapshot', '{not-json');
    await expect(readEmergencyLockSnapshot()).resolves.toMatchObject({ hasProfile: false });
  });

  it('always writes an empty snapshot even when a profile is provided', async () => {
    await setEmergencyLockSurfaceEnabled(true);
    await syncEmergencyLockSurface(makeProfile());
    const stored = await readEmergencyLockSnapshot();
    expect(stored.hasProfile).toBe(false);
    expect(stored.fullName).toBe('');
  });
});
