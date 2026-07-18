export type EmailTemplateId =
  | 'family-connection-request'
  | 'billing-activated'
  | 'billing-renewal'
  | 'billing-payment-failed';

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <tr><td>
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#0d9488;font-weight:600;">CareMate</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:12px;color:#64748b;">You received this email because of activity on your CareMate account.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderFamilyConnectionRequest(vars: {
  fromName: string;
}): RenderedEmail {
  const fromName = vars.fromName.trim() || 'Someone';
  const subject = `${fromName} wants to connect on CareMate Family`;
  const text = [
    `${fromName} sent you a family connection request on CareMate.`,
    '',
    'Open the CareMate app → Family to accept or decline.',
  ].join('\n');
  const html = layout(
    'Family connection request',
    `<p style="margin:0 0 12px;font-size:16px;"><strong>${escapeHtml(fromName)}</strong> wants to connect with you in CareMate Family.</p>
     <p style="margin:0;font-size:15px;color:#334155;">Open the CareMate app and go to <strong>Family</strong> to respond.</p>`,
  );
  return { subject, html, text };
}

export function renderBillingActivated(vars: {
  planLabel: string;
  periodEnd?: string | null;
}): RenderedEmail {
  const planLabel = vars.planLabel.trim() || 'Premium';
  const subject = `Your CareMate ${planLabel} subscription is active`;
  const periodLine = vars.periodEnd
    ? `Your current period ends on ${vars.periodEnd}.`
    : 'Thank you for supporting CareMate.';
  const text = [
    `Your CareMate ${planLabel} subscription is now active.`,
    periodLine,
    '',
    'Open CareMate → Profile → Premium for details.',
  ].join('\n');
  const html = layout(
    'Subscription activated',
    `<p style="margin:0 0 12px;font-size:16px;">Your <strong>${escapeHtml(planLabel)}</strong> subscription is now active.</p>
     <p style="margin:0;font-size:15px;color:#334155;">${escapeHtml(periodLine)}</p>`,
  );
  return { subject, html, text };
}

export function renderBillingRenewal(vars: {
  planLabel: string;
  periodEnd: string;
}): RenderedEmail {
  const planLabel = vars.planLabel.trim() || 'Premium';
  const subject = `CareMate ${planLabel} renews soon`;
  const text = [
    `Your CareMate ${planLabel} subscription renews on ${vars.periodEnd}.`,
    '',
    'Open CareMate → Profile → Premium to review your plan.',
  ].join('\n');
  const html = layout(
    'Renewal reminder',
    `<p style="margin:0 0 12px;font-size:16px;">Your <strong>${escapeHtml(planLabel)}</strong> subscription renews on <strong>${escapeHtml(vars.periodEnd)}</strong>.</p>
     <p style="margin:0;font-size:15px;color:#334155;">Open CareMate → Profile → Premium to review your plan.</p>`,
  );
  return { subject, html, text };
}

export function renderBillingPaymentFailed(vars: {
  planLabel: string;
  reason?: string | null;
}): RenderedEmail {
  const planLabel = vars.planLabel.trim() || 'Premium';
  const reason = vars.reason?.trim();
  const subject = `CareMate ${planLabel} payment failed`;
  const text = [
    `We could not process payment for your CareMate ${planLabel} subscription.`,
    reason ? `Details: ${reason}` : '',
    '',
    'Open CareMate → Profile → Premium to update payment and restore access.',
  ]
    .filter(Boolean)
    .join('\n');
  const html = layout(
    'Payment failed',
    `<p style="margin:0 0 12px;font-size:16px;">We could not process payment for your <strong>${escapeHtml(planLabel)}</strong> subscription.</p>
     ${reason ? `<p style="margin:0 0 12px;font-size:14px;color:#64748b;">${escapeHtml(reason)}</p>` : ''}
     <p style="margin:0;font-size:15px;color:#334155;">Open CareMate → Profile → Premium to update payment and restore access.</p>`,
  );
  return { subject, html, text };
}

export function renderEmailTemplate(
  template: EmailTemplateId,
  vars: Record<string, string | null | undefined>,
): RenderedEmail {
  switch (template) {
    case 'family-connection-request':
      return renderFamilyConnectionRequest({ fromName: vars.fromName ?? 'Someone' });
    case 'billing-activated':
      return renderBillingActivated({
        planLabel: vars.planLabel ?? 'Premium',
        periodEnd: vars.periodEnd,
      });
    case 'billing-renewal':
      return renderBillingRenewal({
        planLabel: vars.planLabel ?? 'Premium',
        periodEnd: vars.periodEnd ?? '',
      });
    case 'billing-payment-failed':
      return renderBillingPaymentFailed({
        planLabel: vars.planLabel ?? 'Premium',
        reason: vars.reason,
      });
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown template: ${_exhaustive}`);
    }
  }
}
