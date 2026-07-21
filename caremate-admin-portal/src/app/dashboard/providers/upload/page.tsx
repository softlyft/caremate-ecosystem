import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { ProviderUploadForm } from '@/features/providers/provider-upload-form';

export default async function UploadProvidersPage() {
  const session = await getPortalSession();
  if (!canEditCatalog(session?.role)) redirect('/dashboard/providers');

  return (
    <div>
      <PageHeader
        title="Upload providers"
        description="Send a Lagos providers workbook or CSV to the ingestion engine."
      />
      <ProviderUploadForm />
    </div>
  );
}
