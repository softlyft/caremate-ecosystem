'use client';

import { cn } from '@/lib/utils';

export function FileUploadButton({
  accept,
  disabled,
  loading,
  loadingLabel = 'Uploading…',
  label = 'Upload',
  onFile,
  className,
}: {
  accept?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  label?: string;
  onFile: (file: File) => void;
  className?: string;
}) {
  return (
    <label
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:bg-gray-100',
        (disabled || loading) && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      ) : null}
      {loading ? loadingLabel : label}
    </label>
  );
}
