import {
  isEmergencyListSet,
  isEmergencyTextSet,
  mergeEmergencyProfiles,
} from '@/domains/emergency/merge-emergency';
import type { EmergencyProfile } from '@/types';

function makeProfile(overrides: Partial<EmergencyProfile> = {}): EmergencyProfile {
  return {
    id: 'ep-remote',
    userId: 'user-1',
    fullName: 'Ada Lovelace',
    photoUrl: null,
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: ['Penicillin'],
    currentMedications: ['Metformin'],
    chronicConditions: [],
    emergencyContacts: [{ name: 'Charles', phone: '+2348012345678', relationship: 'Spouse' }],
    preferredHospital: 'Lagoon',
    insuranceProvider: null,
    notes: 'Carry epipen',
    syncStatus: 'synced',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('merge-emergency', () => {
  it('treats empty strings and empty arrays as unset', () => {
    expect(isEmergencyTextSet(null)).toBe(false);
    expect(isEmergencyTextSet('')).toBe(false);
    expect(isEmergencyTextSet('  ')).toBe(false);
    expect(isEmergencyTextSet('O+')).toBe(true);
    expect(isEmergencyListSet([])).toBe(false);
    expect(isEmergencyListSet(['a'])).toBe(true);
  });

  it('takes the remote profile wholesale when local is missing', () => {
    const remote = makeProfile();
    const merged = mergeEmergencyProfiles(null, remote);
    expect(merged.bloodGroup).toBe('O+');
    expect(merged.allergies).toEqual(['Penicillin']);
    expect(merged.syncStatus).toBe('synced');
  });

  it('fills blank local fields from remote on wipe/rehydrate', () => {
    const local = makeProfile({
      id: 'ep-local',
      fullName: 'Ada',
      bloodGroup: null,
      genotype: null,
      allergies: [],
      currentMedications: [],
      emergencyContacts: [],
      preferredHospital: null,
      notes: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const remote = makeProfile();
    const merged = mergeEmergencyProfiles(local, remote);

    expect(merged.id).toBe('ep-remote');
    expect(merged.fullName).toBe('Ada'); // local set wins
    expect(merged.bloodGroup).toBe('O+');
    expect(merged.allergies).toEqual(['Penicillin']);
    expect(merged.emergencyContacts).toHaveLength(1);
    expect(merged.notes).toBe('Carry epipen');
  });

  it('keeps local values when both sides are set and differ', () => {
    const local = makeProfile({
      id: 'ep-local',
      bloodGroup: 'A+',
      allergies: ['Dust'],
      notes: 'Local note',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    const remote = makeProfile({
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      notes: 'Remote note',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const merged = mergeEmergencyProfiles(local, remote);

    expect(merged.bloodGroup).toBe('A+');
    expect(merged.allergies).toEqual(['Dust']);
    expect(merged.notes).toBe('Local note');
    expect(merged.preferredHospital).toBe('Lagoon'); // remote fills unset-on-neither? both have Lagoon from makeProfile for local
  });
});
