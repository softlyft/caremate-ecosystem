'use server';

// Analytics is read-only in MVP.
export async function noopAnalyticsAction() {
  return null;
}
