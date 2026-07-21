'use client';

import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  /** Subject name shown in the dialog subtitle. */
  subjectName: string;
  /** Describes which FHIR resources are included (e.g. "Organization only"). */
  subtitle?: string;
  bundleJson: string;
  resourceCount: number;
  initialOpen?: boolean;
};

export function ProviderFhirViewButton({
  subjectName,
  subtitle,
  bundleJson,
  resourceCount,
  initialOpen = false,
}: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(initialOpen);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyBundle() {
    try {
      await navigator.clipboard.writeText(bundleJson);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        View FHIR
        {resourceCount > 0 ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted">
            {resourceCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close FHIR view"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 id={titleId} className="text-base font-semibold text-foreground">
                  FHIR Bundle
                </h2>
                <p className="text-sm text-muted">
                  {subtitle ??
                    `Read-only Organization + Location + HealthcareService for ${subjectName}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyBundle}>
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
              {bundleJson}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
