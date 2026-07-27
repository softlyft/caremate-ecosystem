import {
  decodePhiLeaf,
  encodePhiLeaf,
  getMiniAppPhiPaths,
  isEncryptedPhiLeaf,
  mapPayloadPhiLeaves,
  MINI_APP_PHI_PATHS,
} from '../../common/src/phi/mini-app-phi';
import {
  decryptField,
  encryptField,
  FIELD_CIPHER_PREFIX,
  generateDek,
} from './field-cipher';
import {
  decryptMiniAppPayload,
  encryptMiniAppPayload,
} from './mini-app-payload-cipher';

describe('mini-app PHI leaf cipher', () => {
  const dek = generateDek();

  it('exposes path maps for every mini-app key', () => {
    expect(Object.keys(MINI_APP_PHI_PATHS).sort()).toEqual(
      [
        'checkup',
        'immunization',
        'medication',
        'period',
        'pregnancy',
        'vitals',
      ].sort(),
    );
  });

  it('encrypts clinical leaves but leaves who/structure ids plaintext', () => {
    const payload = {
      medications: [
        {
          id: 'med-1',
          name: 'Amoxicillin',
          dosage: '250mg',
          forKid: true,
          familyMemberId: 'child-1',
          patientName: 'Ada',
          frequency: 'twice_daily',
          slotTimes: ['08:00', '20:00'],
          instructions: { kind: 'custom', text: 'After food' },
          notes: 'Allergy watch',
        },
      ],
      activeMedicationId: 'med-1',
      logs: [
        {
          id: 'log-1',
          medicationId: 'med-1',
          dateKey: '2026-07-01',
          slotIndex: 0,
          notes: 'Took late',
          takenAt: '2026-07-01T08:15:00.000Z',
        },
      ],
    };

    const encrypted = encryptMiniAppPayload('medication', payload, dek);
    const med = (encrypted.medications as Record<string, unknown>[])[0];
    const log = (encrypted.logs as Record<string, unknown>[])[0];

    expect(med.id).toBe('med-1');
    expect(med.forKid).toBe(true);
    expect(med.familyMemberId).toBe('child-1');
    expect(med.frequency).toBe('twice_daily');
    expect(encrypted.activeMedicationId).toBe('med-1');
    expect(log.medicationId).toBe('med-1');
    expect(log.slotIndex).toBe(0);

    expect(String(med.name)).toMatch(/^v1:/);
    expect(String(med.dosage)).toMatch(/^v1:/);
    expect(String(med.patientName)).toMatch(/^v1:/);
    expect(String(med.notes)).toMatch(/^v1:/);
    expect(String((med.slotTimes as string[])[0])).toMatch(/^v1:/);
    expect(String((med.instructions as Record<string, unknown>).text)).toMatch(
      /^v1:/,
    );
    expect((med.instructions as Record<string, unknown>).kind).toBe('custom');
    expect(String(log.notes)).toMatch(/^v1:/);
    expect(String(log.dateKey)).toMatch(/^v1:/);

    const decrypted = decryptMiniAppPayload('medication', encrypted, dek);
    expect(decrypted).toEqual(payload);
  });

  it('round-trips nested pregnancy dailyLogs without encrypting map keys', () => {
    const payload = {
      lastMenstrualPeriod: '2026-01-01',
      dueDate: '2026-10-08',
      babyNickname: 'Bean',
      dailyLogs: {
        '2026-07-01': {
          dateKey: '2026-07-01',
          mood: 'good',
          symptoms: ['nausea'],
          kickCount: 12,
          notes: 'Felt kicks',
          weightKg: 62.5,
        },
      },
    };

    const encrypted = encryptMiniAppPayload('pregnancy', payload, dek);
    expect(Object.keys(encrypted.dailyLogs as object)).toEqual(['2026-07-01']);
    const day = (
      encrypted.dailyLogs as Record<string, Record<string, unknown>>
    )['2026-07-01'];
    expect(String(day.mood)).toMatch(/^v1:/);
    expect(String((day.symptoms as string[])[0])).toMatch(/^v1:/);
    expect(String(day.kickCount)).toMatch(/^v1:/);
    expect(String(day.weightKg)).toMatch(/^v1:/);

    expect(decryptMiniAppPayload('pregnancy', encrypted, dek)).toEqual(payload);
  });

  it('mapPayloadPhiLeaves encodes/decodes leaf types via JSON', () => {
    const paths = getMiniAppPhiPaths('vitals');
    const payload = {
      entries: [
        { id: 'e1', type: 'weight', unit: 'kg', value: 70.2, notes: 'am' },
      ],
      unitPrefs: { weight: 'kg' },
    };
    const encoded = mapPayloadPhiLeaves(payload, paths, (leaf: unknown) =>
      encryptField(encodePhiLeaf(leaf), dek),
    ) as Record<string, unknown>;
    const entry = (encoded.entries as Record<string, unknown>[])[0];
    expect(entry.id).toBe('e1');
    expect(entry.type).toBe('weight');
    expect(entry.unit).toBe('kg');
    expect(isEncryptedPhiLeaf(entry.value)).toBe(true);
    expect((encoded.unitPrefs as Record<string, unknown>).weight).toBe('kg');

    const decoded = mapPayloadPhiLeaves(encoded, paths, (leaf: unknown) => {
      if (!isEncryptedPhiLeaf(leaf)) {
        return leaf;
      }
      return decodePhiLeaf(decryptField(String(leaf), dek));
    });
    expect(decoded).toEqual(payload);
    expect(FIELD_CIPHER_PREFIX).toBe('v1:');
  });
});
