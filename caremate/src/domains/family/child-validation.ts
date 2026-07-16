import { z } from 'zod';

import type { FamilyMemberGender } from '@/domains/family/types';

export const DATE_OF_BIRTH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ChildProfileMessages = {
  nameRequired: string;
  dobFormat: string;
  dobInvalid: string;
};

export type ChildProfileFields = {
  fullName: string;
  dateOfBirth: string;
  gender: FamilyMemberGender;
  notes?: string;
};

export function isValidPastDateOfBirth(value: string): boolean {
  if (!DATE_OF_BIRTH_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
}

/** Shared Zod schema for setup wizard + hub inline add. */
export function createChildProfileSchema(messages: ChildProfileMessages) {
  return z.object({
    fullName: z.string().min(1, messages.nameRequired),
    dateOfBirth: z
      .string()
      .regex(DATE_OF_BIRTH_PATTERN, messages.dobFormat)
      .refine(isValidPastDateOfBirth, messages.dobInvalid),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
    notes: z.string().optional(),
  });
}

export type ChildValidationFailure = 'name' | 'dobFormat' | 'dobInvalid';

/**
 * Lightweight check for inline forms that are not on React Hook Form.
 * Same rules as `createChildProfileSchema` for name + DOB.
 */
export function validateChildNameAndDob(
  fullName: string,
  dateOfBirth: string,
): { ok: true; fullName: string; dateOfBirth: string } | { ok: false; reason: ChildValidationFailure } {
  const name = fullName.trim();
  const dob = dateOfBirth.trim();

  if (!name) {
    return { ok: false, reason: 'name' };
  }
  if (!DATE_OF_BIRTH_PATTERN.test(dob)) {
    return { ok: false, reason: 'dobFormat' };
  }
  if (!isValidPastDateOfBirth(dob)) {
    return { ok: false, reason: 'dobInvalid' };
  }

  return { ok: true, fullName: name, dateOfBirth: dob };
}
