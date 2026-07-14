import { notFound, redirect } from 'next/navigation';
import { getProvider } from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ProviderForm } from '@/features/providers/provider-form';

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  const { id } = await params;

  let provider;
  try {
    provider = await getProvider(id);
  } catch {
    provider = null;
  }
  if (!provider) notFound();
  if (!canEditCatalog(session?.role)) redirect('/dashboard/providers');

  return (
    <div>
      <PageHeader title={provider.name} description={`ID: ${provider.id}`} />
      <ProviderForm provider={provider} />
    </div>
  );
}
