'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { openDocumentAction } from '@/domains/documents/actions';
import { Button } from '@/components/ui/button';

export function OpenDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const { url } = await openDocumentAction(documentId);
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not open document');
          }
        });
      }}
    >
      {pending ? 'Opening…' : 'Open'}
    </Button>
  );
}
