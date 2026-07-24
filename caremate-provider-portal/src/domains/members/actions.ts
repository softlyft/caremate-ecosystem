'use server';

import { revalidatePath } from 'next/cache';
import { requireManageAccess } from '@/lib/auth';
import { markConnectedPatientAsStaff } from '@/domains/members/repository';

function revalidateMemberPaths(patientUserId: string) {
  revalidatePath('/app/patients');
  revalidatePath(`/app/patients/${patientUserId}`);
  revalidatePath('/app/dashboard');
}

export async function markAsStaffAction(formData: FormData) {
  const session = await requireManageAccess();
  const patientUserId = String(formData.get('patient_user_id') ?? '').trim();
  if (!patientUserId) {
    throw new Error('Patient is required');
  }

  await markConnectedPatientAsStaff({
    organizationId: session.activeOrganizationId,
    patientUserId,
    companyEmail: String(formData.get('company_email') ?? '').trim() || null,
    companyPhone: String(formData.get('company_phone') ?? '').trim() || null,
    position: String(formData.get('position') ?? '').trim() || null,
    displayName: String(formData.get('display_name') ?? '').trim() || null,
  });

  revalidateMemberPaths(patientUserId);
}
