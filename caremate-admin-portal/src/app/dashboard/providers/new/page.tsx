import { redirect } from 'next/navigation';

/** Manual create retired — catalog comes from ingest uploads. */
export default function NewProviderRedirectPage() {
  redirect('/dashboard/providers/upload');
}
