import { openDocumentAction } from '@/domains/documents/actions';
import { Button } from '@/components/ui/button';

export function OpenDocumentButton({ documentId }: { documentId: string }) {
  return (
    <form action={openDocumentAction}>
      <input type="hidden" name="document_id" value={documentId} />
      <Button type="submit" variant="secondary" size="sm">
        Open
      </Button>
    </form>
  );
}
