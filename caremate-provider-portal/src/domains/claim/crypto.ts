import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return normalized;
  }

  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  if (domain === 'gmail.com') {
    const plus = local.indexOf('+');
    if (plus >= 0) {
      local = local.slice(0, plus);
    }
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
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
