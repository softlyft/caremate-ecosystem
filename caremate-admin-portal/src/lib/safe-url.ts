/**
 * Allow https URLs and same-origin relative paths for CTA / website fields.
 * Rejects javascript:, data:, protocol-relative, and non-https absolute URLs.
 */
export function isSafeExternalUrl(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    if (trimmed.includes('://') || trimmed.includes('\\')) return false;
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function assertSafeExternalUrl(value: string | null | undefined, label = 'URL'): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isSafeExternalUrl(trimmed)) {
    throw new Error(`${label} must be an https URL or a relative path starting with /`);
  }
  return trimmed;
}
