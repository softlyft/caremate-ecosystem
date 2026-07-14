import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ProviderForm } from '@/features/providers/provider-form';

export default async function NewProviderPage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) redirect('/dashboard/providers');

  return (
    <div>
      <PageHeader title="New provider" description="Add a facility to the Nearby catalog." />
      <ProviderForm />
    </div>
  );
}
