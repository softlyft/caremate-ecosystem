import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashClaimCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export function generateClaimCode(): string {
  return String(randomInt(100000, 999999));
}

export function codesMatch(expectedHash: string, submittedCode: string): boolean {
  const submitted = Buffer.from(hashClaimCode(submittedCode));
  const expected = Buffer.from(expectedHash);
  if (submitted.length !== expected.length) return false;
  return timingSafeEqual(submitted, expected);
}
