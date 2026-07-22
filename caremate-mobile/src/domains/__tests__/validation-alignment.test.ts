import {
  createChildProfileSchema,
  isValidPastDateOfBirth,
  validateChildNameAndDob,
} from '@/domains/family/child-validation';
import { hasRequiredIceContact, isCompleteIceContact } from '@/domains/emergency/validation';

describe('ICE contact validation', () => {
  it('requires name, valid phone (7–15 digits), and relationship', () => {
    expect(
      isCompleteIceContact({ name: 'Ada', phone: '+2348012345678', relationship: 'Spouse' }),
    ).toBe(true);
    expect(isCompleteIceContact({ name: 'Ada', phone: '+1', relationship: 'Spouse' })).toBe(false);
    expect(isCompleteIceContact({ name: 'Ada', phone: '', relationship: 'Spouse' })).toBe(false);
  });

  it('requires at least one complete contact on the profile', () => {
    expect(hasRequiredIceContact([])).toBe(false);
    expect(
      hasRequiredIceContact([{ name: 'Ada', phone: '+2348012345678', relationship: 'Spouse' }]),
    ).toBe(true);
  });
});

describe('child profile validation', () => {
  const messages = {
    nameRequired: 'name',
    dobFormat: 'format',
    dobInvalid: 'invalid',
  };

  it('accepts a valid past YYYY-MM-DD date', () => {
    expect(isValidPastDateOfBirth('2018-05-01')).toBe(true);
    expect(isValidPastDateOfBirth('2018-13-01')).toBe(false);
    expect(isValidPastDateOfBirth('2999-01-01')).toBe(false);
  });

  it('shares the same name/DOB rules for inline and Zod forms', () => {
    expect(validateChildNameAndDob('  Ada  ', '2018-05-01')).toEqual({
      ok: true,
      fullName: 'Ada',
      dateOfBirth: '2018-05-01',
    });
    expect(validateChildNameAndDob('', '2018-05-01')).toEqual({ ok: false, reason: 'name' });
    expect(validateChildNameAndDob('Ada', '05-01-2018')).toEqual({
      ok: false,
      reason: 'dobFormat',
    });

    const schema = createChildProfileSchema(messages);
    expect(
      schema.safeParse({ fullName: 'Ada', dateOfBirth: '2018-05-01', gender: 'female' }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ fullName: 'Ada', dateOfBirth: '2999-01-01', gender: 'female' }).success,
    ).toBe(false);
  });
});
