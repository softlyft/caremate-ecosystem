import { isEncryptedEnvelope, scrubEncryptedJson, scrubEncryptedText } from '../phi';
import {
  emergencyToGatewayBody,
  healthTimelineEventToGatewayBody,
  profileToGatewayBody,
} from '../api';

describe('health-data-gateway phi scrubbing', () => {
  it('detects gateway ciphertext envelopes', () => {
    expect(isEncryptedEnvelope('v1:abc:def:ghi')).toBe(true);
    expect(isEncryptedEnvelope('1990-01-01')).toBe(false);
    expect(isEncryptedEnvelope(null)).toBe(false);
  });

  it('scrubs encrypted text to null', () => {
    expect(scrubEncryptedText('v1:x:y:z')).toBeNull();
    expect(scrubEncryptedText('plain')).toBe('plain');
  });

  it('scrubs encrypted json to empty array', () => {
    expect(scrubEncryptedJson('v1:x:y:z')).toEqual([]);
    expect(scrubEncryptedJson(['penicillin'])).toEqual(['penicillin']);
  });
});

describe('gateway body mappers', () => {
  it('maps profile camelCase to snake_case', () => {
    const body = profileToGatewayBody({
      id: 'p1',
      userId: 'u1',
      fullName: 'Ada',
      email: 'a@b.c',
      phone: '080',
      dateOfBirth: '1990-01-01',
      avatarUrl: null,
      countryCode: 'NG',
      languageCode: 'en',
      state: 'LA',
      gender: 'female',
      addressLine: '1 Road',
      city: 'Lagos',
      postalCode: '100001',
      nationalId: '123',
      maritalStatus: 'single',
      isHealthPractitioner: false,
      patientId: null,
      emergencyShareToken: null,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: 't0',
      updatedAt: 't1',
    });

    expect(body).toMatchObject({
      id: 'p1',
      user_id: 'u1',
      full_name: 'Ada',
      date_of_birth: '1990-01-01',
      national_id: '123',
    });
  });

  it('maps emergency arrays through unchanged', () => {
    const body = emergencyToGatewayBody({
      id: 'e1',
      userId: 'u1',
      fullName: 'Ada',
      photoUrl: null,
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: ['dust'],
      currentMedications: [],
      chronicConditions: [],
      emergencyContacts: [],
      preferredHospital: null,
      insuranceProvider: null,
      notes: null,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: 't0',
      updatedAt: 't1',
    });

    expect(body.blood_group).toBe('O+');
    expect(body.allergies).toEqual(['dust']);
  });

  it('maps health timeline events to snake_case', () => {
    const body = healthTimelineEventToGatewayBody({
      id: 'u:vitals:vital:1',
      userId: 'u1',
      appKey: 'vitals',
      kind: 'vital',
      occurredOn: '2026-03-02',
      occurredAt: '2026-03-02T15:00:00.000Z',
      title: 'Heart Rate',
      summary: '72 bpm',
      payload: { type: 'heart_rate' },
      updatedAt: 't1',
    });
    expect(body).toMatchObject({
      id: 'u:vitals:vital:1',
      user_id: 'u1',
      occurred_on: '2026-03-02',
      title: 'Heart Rate',
    });
  });
});
