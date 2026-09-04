const REMEMBERED_EMAIL_KEY = 'caremate_care_portal_remembered_email';

export function getRememberedLoginEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setRememberedLoginEmail(email: string, remember: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (!remember || !email.trim()) {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      return;
    }
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // Best-effort preference.
  }
}
