'use server';

import { revalidatePath } from 'next/cache';
import { requirePayerManageAccess } from '@/lib/auth';
import { markConnectedPatientAsPayerStaff } from '@/domains/payer-members/repository';

function revalidateMemberPaths(patientUserId: string) {
  revalidatePath('/payer/patients');
  revalidatePath(`/payer/patients/${patientUserId}`);
  revalidatePath('/payer/dashboard');
}

export async function markPayerStaffAction(formData: FormData) {
  const session = await requirePayerManageAccess();
  const patientUserId = String(formData.get('patient_user_id') ?? '').trim();
  if (!patientUserId) {
    throw new Error('Patient is required');
  }

  await markConnectedPatientAsPayerStaff({
    organizationId: session.activeOrganizationId,
    patientUserId,
    companyEmail: String(formData.get('company_email') ?? '').trim() || null,
    companyPhone: String(formData.get('company_phone') ?? '').trim() || null,
    position: String(formData.get('position') ?? '').trim() || null,
    displayName: String(formData.get('display_name') ?? '').trim() || null,
  });

  revalidateMemberPaths(patientUserId);
}
