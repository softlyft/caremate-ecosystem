/** Nigeria National Identification Number — 11 digits. */
export function isValidNigerianNin(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^\d{11}$/.test(value.trim());
}

export function sanitizeNationalIdInput(value: string, countryCode: string | null): string {
  const digits = value.replace(/\D/g, '');
  if ((countryCode ?? '').toUpperCase() === 'NG') {
    return digits.slice(0, 11);
  }
  return value.trim().slice(0, 32);
}
