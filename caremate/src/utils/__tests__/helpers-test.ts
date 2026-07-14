import { joinFullName, splitFullName } from '@/domains/emergency/constants';
import { getMedicationPatientLabel, type Medication } from '@/mini-apps/medication-tracker/utils';
import { parseJson, parseJsonArray, stringifyJson } from '@/utils/helpers';

describe('splitFullName / joinFullName', () => {
  test('splits a two-part name', () => {
    expect(splitFullName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
  });

  test('keeps extra names in lastName', () => {
    expect(splitFullName('Mary Ann Evans')).toEqual({ firstName: 'Mary', lastName: 'Ann Evans' });
  });

  test('handles empty and whitespace', () => {
    expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
    expect(splitFullName('  Solo  ')).toEqual({ firstName: 'Solo', lastName: '' });
  });

  test('joins trimmed parts', () => {
    expect(joinFullName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(joinFullName('Ada', '')).toBe('Ada');
  });
});

describe('helpers JSON parsers', () => {
  test('parseJsonArray returns parsed arrays and fallbacks', () => {
    expect(parseJsonArray('[1,2]', [])).toEqual([1, 2]);
    expect(parseJsonArray(null, [9])).toEqual([9]);
    expect(parseJsonArray('not-json', [9])).toEqual([9]);
    expect(parseJsonArray('{"a":1}', [9])).toEqual([9]);
  });

  test('parseJson and stringifyJson round-trip', () => {
    expect(parseJson('{"ok":true}', { ok: false })).toEqual({ ok: true });
    expect(parseJson(undefined, { ok: false })).toEqual({ ok: false });
    expect(stringifyJson({ a: 1 })).toBe('{"a":1}');
  });
});

describe('getMedicationPatientLabel', () => {
  const base: Medication = {
    id: '1',
    name: 'Ibuprofen',
    dosage: '200mg',
    frequency: 'once-daily',
    startDate: '2026-01-01',
    active: true,
    forKid: false,
    familyMemberId: null,
    patientName: null,
  };

  test('labels adult medicines as You', () => {
    expect(getMedicationPatientLabel(base)).toBe('You');
  });

  test('labels kid medicines with patient name or Child', () => {
    expect(getMedicationPatientLabel({ ...base, forKid: true, patientName: 'Tola' })).toBe('Tola');
    expect(getMedicationPatientLabel({ ...base, forKid: true, patientName: null })).toBe('Child');
  });
});
