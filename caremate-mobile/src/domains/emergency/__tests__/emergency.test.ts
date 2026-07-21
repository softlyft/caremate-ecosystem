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
import { hasRequiredIceContact, isCompleteIceContact } from '@/domains/emergency/validation';
import type { EmergencyProfile } from '@/types';

jest.mock('emergency-lock-widget', () => ({
  updateAndroidEmergencyWidget: jest.fn(async () => undefined),
}));

jest.mock('@/widgets/EmergencyLockWidget', () => ({
  __esModule: true,
  default: {
    updateSnapshot: jest.fn(),
  },
}));

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
        phone: '+234800',
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
  it('requires name, phone, and relationship for a complete ICE contact', () => {
    expect(isCompleteIceContact({ name: 'Ada', phone: '+1', relationship: 'Friend' })).toBe(true);
    expect(isCompleteIceContact({ name: 'Ada', phone: '  ', relationship: 'Friend' })).toBe(false);
    expect(
      hasRequiredIceContact([
        { name: '', phone: '+1', relationship: 'Friend' },
        { name: 'Ada', phone: '+1', relationship: 'Friend' },
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
    expect(snapshot.contactPhone).toBe('+234800');
  });

  it('builds an empty snapshot when profile is missing or unnamed', () => {
    expect(buildEmergencyLockSnapshot(null).hasProfile).toBe(false);
    expect(buildEmergencyLockSnapshot(makeProfile({ fullName: '   ' })).fullName).toBe(
      'CareMate user',
    );
  });

  it('defaults lock surface to enabled and persists the toggle', async () => {
    await expect(isEmergencyLockSurfaceEnabled()).resolves.toBe(true);
    await setEmergencyLockSurfaceEnabled(false);
    await expect(isEmergencyLockSurfaceEnabled()).resolves.toBe(false);
    await setEmergencyLockSurfaceEnabled(true);
    await expect(isEmergencyLockSurfaceEnabled()).resolves.toBe(true);
  });

  it('reads empty snapshot when storage is empty or corrupt', async () => {
    await expect(readEmergencyLockSnapshot()).resolves.toMatchObject({ hasProfile: false });
    await AsyncStorage.setItem('caremate_emergency_lock_snapshot', '{not-json');
    await expect(readEmergencyLockSnapshot()).resolves.toMatchObject({ hasProfile: false });
  });

  it('syncs a profile snapshot to storage when enabled', async () => {
    await syncEmergencyLockSurface(makeProfile());
    const stored = await readEmergencyLockSnapshot();
    expect(stored.hasProfile).toBe(true);
    expect(stored.fullName).toBe('Ada Lovelace');
  });

  it('writes an empty snapshot when the lock surface is disabled', async () => {
    await setEmergencyLockSurfaceEnabled(false);
    await syncEmergencyLockSurface(makeProfile());
    const stored = await readEmergencyLockSnapshot();
    expect(stored.hasProfile).toBe(false);
    expect(stored.fullName).toBe('');
  });
});
