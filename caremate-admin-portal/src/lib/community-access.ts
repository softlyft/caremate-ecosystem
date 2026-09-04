import { getPortalSession } from '@/lib/auth';
import { canManageCommunity } from '@/constants/roles';
import type { StaffRole } from '@/constants/roles';

export type CommunityManageSession = {
  role: StaffRole;
};

/** Returns session when the user can manage community; otherwise null. */
export async function getCommunityManageSession(): Promise<CommunityManageSession | null> {
  const session = await getPortalSession();
  if (!session || !canManageCommunity(session.role)) {
    return null;
  }
  return { role: session.role };
}
