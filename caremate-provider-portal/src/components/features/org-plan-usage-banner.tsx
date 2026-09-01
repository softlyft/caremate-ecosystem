import type { ReactNode } from 'react';

export type OrgPlanLimitRow = {
  label: string;
  used: number;
  limit: number;
};

export function OrgPlanUsageBanner({
  title = 'Plan usage',
  rows,
  upgradeHref,
  footer,
}: {
  title?: string;
  rows: OrgPlanLimitRow[];
  upgradeHref?: string;
  footer?: ReactNode;
}) {
  const atAnyLimit = rows.some((row) => row.used >= row.limit);

  return (
    <div
      className={`rounded-md border p-4 text-sm ${
        atAnyLimit ? 'border-orange-200 bg-orange-50' : 'border-border bg-muted/30'
      }`}
    >
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-muted">
        {rows.map((row) => (
          <li key={row.label}>
            {row.label}:{' '}
            <strong className={row.used >= row.limit ? 'text-orange-800' : 'text-foreground'}>
              {row.used}
            </strong>{' '}
            / <strong>{row.limit}</strong>
          </li>
        ))}
      </ul>
      {atAnyLimit && upgradeHref ? (
        <p className="mt-2 text-xs text-orange-800">
          Limit reached on your current plan.{' '}
          <a href={upgradeHref} className="font-medium underline">
            Upgrade in Settings → Billing
          </a>
          .
        </p>
      ) : null}
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
