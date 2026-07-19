'use server';

// Patients domain is read-focused in MVP; mutations live under connections/documents/appointments.
export async function noopPatientsAction() {
  return null;
}
