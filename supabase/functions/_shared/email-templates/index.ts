/**
 * CareMate transactional email templates (SES / Edge Functions).
 * Inline styles + table layout for broad email-client support.
 */

export type EmailTemplateId =
  | 'family-connection-request'
  | 'billing-activated'
  | 'billing-renewal'
  | 'billing-payment-failed'
  | 'provider-org-claim-otp'
  | 'provider-password-reset-otp'
  | 'community-join-otp';

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/** Mirrors caremate-website `tokens.css` / mobile palette. */
const BRAND = {
  name: 'CareMate',
  tagline: 'Your Health. Our Priority.',
  siteUrl: 'https://getcaremate.com',
  supportEmail: 'hello@getcaremate.com',
  logoUrl: 'https://getcaremate.com/caremate-logo.png',
  privacyUrl: 'https://getcaremate.com/privacy',
  termsUrl: 'https://getcaremate.com/terms',
  providerPortalUrl: 'https://app.getcaremate.com',
  communityPortalUrl: 'https://community.getcaremate.com',
  primary: '#0d9488',
  primaryDark: '#0f766e',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#94a3b8',
  surface: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  warningSoft: '#fff7ed',
  warningBorder: '#fed7aa',
  successSoft: '#f0fdfa',
  successBorder: '#99f6e4',
} as const;

type LayoutTone = 'default' | 'success' | 'warning' | 'danger';

type LayoutOptions = {
  title: string;
  preheader: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  tone?: LayoutTone;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tonePanel(tone: LayoutTone): { background: string; border: string } | null {
  switch (tone) {
    case 'success':
      return { background: BRAND.successSoft, border: BRAND.successBorder };
    case 'warning':
      return { background: BRAND.warningSoft, border: BRAND.warningBorder };
    case 'danger':
      return { background: BRAND.dangerSoft, border: BRAND.dangerBorder };
    default:
      return null;
  }
}

function layout(options: LayoutOptions): string {
  const tone = options.tone ?? 'default';
  const panel = tonePanel(tone);
  const year = new Date().getUTCFullYear();
  const title = escapeHtml(options.title);
  const preheader = escapeHtml(options.preheader);
  const ctaLabel = escapeHtml(options.ctaLabel);
  const ctaUrl = escapeHtml(options.ctaUrl);

  const bodyBlock = panel
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:${panel.background};border:1px solid ${panel.border};border-radius:12px;">
        <tr><td style="padding:18px 20px;">${options.bodyHtml}</td></tr>
      </table>`
    : `<div style="margin:0 0 24px;">${options.bodyHtml}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.surface};opacity:0;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.surface};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:${BRAND.primary};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <a href="${BRAND.siteUrl}" style="text-decoration:none;">
                <img src="${BRAND.logoUrl}" width="168" alt="${BRAND.name} — ${escapeHtml(BRAND.tagline)}" style="display:block;margin:0 auto;width:168px;max-width:72%;height:auto;border:0;outline:none;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${BRAND.text};">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};text-align:left;">
                ${title}
              </h1>
              ${bodyBlock}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;background:${BRAND.primary};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${BRAND.textMuted};text-align:center;">
                Button not working? Open CareMate on your phone, or visit
                <a href="${BRAND.siteUrl}" style="color:${BRAND.primaryDark};text-decoration:underline;">${escapeHtml(BRAND.siteUrl.replace('https://', ''))}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid ${BRAND.border};background:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${BRAND.textSecondary};text-align:center;">
                Questions? Write to
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryDark};text-decoration:none;font-weight:600;">${BRAND.supportEmail}</a>
              </p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${BRAND.textMuted};text-align:center;">
                <a href="${BRAND.privacyUrl}" style="color:${BRAND.textMuted};text-decoration:underline;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${BRAND.termsUrl}" style="color:${BRAND.textMuted};text-decoration:underline;">Terms</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:${BRAND.textMuted};text-align:center;">
                © ${year} ${BRAND.name}. You received this email because of activity on your CareMate account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textFooter(): string {
  return [
    '',
    '—',
    `${BRAND.name} · ${BRAND.tagline}`,
    `Support: ${BRAND.supportEmail}`,
    BRAND.siteUrl,
  ].join('\n');
}

export function renderFamilyConnectionRequest(vars: {
  fromName: string;
}): RenderedEmail {
  const fromName = vars.fromName.trim() || 'Someone';
  const subject = `${fromName} wants to connect on CareMate Family`;
  const preheader = `${fromName} sent you a family connection request. Open CareMate to respond.`;
  const text = [
    `${fromName} sent you a family connection request on CareMate.`,
    '',
    'Open the CareMate app → Family to accept or decline.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Family connection request',
    preheader,
    tone: 'default',
    ctaLabel: 'Open CareMate Family',
    ctaUrl: BRAND.siteUrl,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        <strong style="color:${BRAND.primaryDark};">${escapeHtml(fromName)}</strong> wants to connect with you in CareMate Family.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        Open the CareMate app and go to <strong style="color:${BRAND.text};">Family</strong> to accept or decline this request.
      </p>`,
  });
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
  const preheader = `Your ${planLabel} subscription is active. ${periodLine}`;
  const text = [
    `Your CareMate ${planLabel} subscription is now active.`,
    periodLine,
    '',
    'Open CareMate → Profile → Premium for details.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Subscription activated',
    preheader,
    tone: 'success',
    ctaLabel: 'View Premium in CareMate',
    ctaUrl: BRAND.siteUrl,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        Your <strong style="color:${BRAND.primaryDark};">${escapeHtml(planLabel)}</strong> subscription is now active.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        ${escapeHtml(periodLine)} Open CareMate → Profile → Premium anytime for plan details.
      </p>`,
  });
  return { subject, html, text };
}

export function renderBillingRenewal(vars: {
  planLabel: string;
  periodEnd: string;
}): RenderedEmail {
  const planLabel = vars.planLabel.trim() || 'Premium';
  const subject = `CareMate ${planLabel} renews soon`;
  const preheader = `Your ${planLabel} subscription renews on ${vars.periodEnd}.`;
  const text = [
    `Your CareMate ${planLabel} subscription renews on ${vars.periodEnd}.`,
    '',
    'Open CareMate → Profile → Premium to review your plan.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Renewal reminder',
    preheader,
    tone: 'warning',
    ctaLabel: 'Review your plan',
    ctaUrl: BRAND.siteUrl,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        Your <strong style="color:${BRAND.primaryDark};">${escapeHtml(planLabel)}</strong> subscription renews on
        <strong style="color:${BRAND.text};">${escapeHtml(vars.periodEnd)}</strong>.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        Open CareMate → Profile → Premium to review your plan or update payment details.
      </p>`,
  });
  return { subject, html, text };
}

export function renderBillingPaymentFailed(vars: {
  planLabel: string;
  reason?: string | null;
}): RenderedEmail {
  const planLabel = vars.planLabel.trim() || 'Premium';
  const reason = vars.reason?.trim();
  const subject = `CareMate ${planLabel} payment failed`;
  const preheader = `We could not process payment for your ${planLabel} subscription. Update payment in CareMate.`;
  const text = [
    `We could not process payment for your CareMate ${planLabel} subscription.`,
    reason ? `Details: ${reason}` : '',
    '',
    'Open CareMate → Profile → Premium to update payment and restore access.',
    textFooter(),
  ]
    .filter(Boolean)
    .join('\n');
  const html = layout({
    title: 'Payment failed',
    preheader,
    tone: 'danger',
    ctaLabel: 'Update payment in CareMate',
    ctaUrl: BRAND.siteUrl,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        We could not process payment for your <strong style="color:${BRAND.danger};">${escapeHtml(planLabel)}</strong> subscription.
      </p>
      ${
        reason
          ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${BRAND.textSecondary};">Details: ${escapeHtml(reason)}</p>`
          : ''
      }
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        Open CareMate → Profile → Premium to update payment and restore access.
      </p>`,
  });
  return { subject, html, text };
}

export function renderProviderOrgClaimOtp(vars: {
  code: string;
  orgName?: string | null;
  expiresMinutes?: number;
  orgKind?: 'provider' | 'payer' | null;
}): RenderedEmail {
  const code = vars.code.trim();
  const orgName = vars.orgName?.trim() || 'your organization';
  const expiresMinutes = vars.expiresMinutes ?? 15;
  const orgKindLabel = vars.orgKind === 'payer' ? 'payer' : 'provider';
  const subject = `Your CareMate ${orgKindLabel} verification code`;
  const preheader = `Use code ${code} to claim ${orgName} on the CareMate Care Portal.`;
  const text = [
    `Your CareMate ${orgKindLabel} verification code is ${code}.`,
    '',
    `Organization: ${orgName}`,
    `This code expires in ${expiresMinutes} minutes.`,
    '',
    'If you did not request this, you can ignore this email.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Verify your organization claim',
    preheader,
    tone: 'default',
    ctaLabel: 'Open Care Portal',
    ctaUrl: `${BRAND.providerPortalUrl}/claim`,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        Enter this code to claim <strong style="color:${BRAND.primaryDark};">${escapeHtml(orgName)}</strong> on the CareMate Care Portal.
      </p>
      <p style="margin:0 0 16px;font-size:28px;line-height:1.2;letter-spacing:0.28em;font-weight:700;color:${BRAND.primaryDark};text-align:center;">
        ${escapeHtml(code)}
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        This code expires in <strong style="color:${BRAND.text};">${expiresMinutes} minutes</strong>. If you did not request it, you can ignore this email.
      </p>`,
  });
  return { subject, html, text };
}

export function renderProviderPasswordResetOtp(vars: {
  code: string;
  expiresMinutes?: number;
}): RenderedEmail {
  const code = vars.code.trim();
  const expiresMinutes = vars.expiresMinutes ?? 15;
  const subject = `Your CareMate password reset code`;
  const preheader = `Use code ${code} to reset your Care Portal password.`;
  const text = [
    `Your CareMate password reset code is ${code}.`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    '',
    'If you did not request a password reset, you can ignore this email.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Reset your password',
    preheader,
    tone: 'default',
    ctaLabel: 'Open Care Portal',
    ctaUrl: `${BRAND.providerPortalUrl}/forgot-password`,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        Enter this code to reset your password on the CareMate Care Portal.
      </p>
      <p style="margin:0 0 16px;font-size:28px;line-height:1.2;letter-spacing:0.28em;font-weight:700;color:${BRAND.primaryDark};text-align:center;">
        ${escapeHtml(code)}
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        This code expires in <strong style="color:${BRAND.text};">${expiresMinutes} minutes</strong>. If you did not request it, you can ignore this email.
      </p>`,
  });
  return { subject, html, text };
}

export function renderCommunityJoinOtp(vars: {
  code: string;
  expiresMinutes?: number;
}): RenderedEmail {
  const code = vars.code.trim();
  const expiresMinutes = vars.expiresMinutes ?? 10;
  const subject = `Your CareMate community verification code`;
  const preheader = `Use code ${code} to join the CareMate Community Network.`;
  const text = [
    `Your CareMate community verification code is ${code}.`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    '',
    `Continue at ${BRAND.communityPortalUrl}/join`,
    '',
    'If you did not request this, you can ignore this email.',
    textFooter(),
  ].join('\n');
  const html = layout({
    title: 'Verify your CareMate account',
    preheader,
    tone: 'default',
    ctaLabel: 'Continue community join',
    ctaUrl: `${BRAND.communityPortalUrl}/join`,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${BRAND.text};">
        Enter this code on the CareMate Community Network join page to verify your account.
      </p>
      <p style="margin:0 0 16px;font-size:28px;line-height:1.2;letter-spacing:0.28em;font-weight:700;color:${BRAND.primaryDark};text-align:center;">
        ${escapeHtml(code)}
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:${BRAND.textSecondary};">
        This code expires in <strong style="color:${BRAND.text};">${expiresMinutes} minutes</strong>. If you did not request it, you can ignore this email.
      </p>`,
  });
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
    case 'provider-org-claim-otp':
      return renderProviderOrgClaimOtp({
        code: vars.code ?? '',
        orgName: vars.orgName,
        orgKind: vars.orgKind === 'payer' ? 'payer' : 'provider',
        expiresMinutes: vars.expiresMinutes ? Number(vars.expiresMinutes) : 15,
      });
    case 'provider-password-reset-otp':
      return renderProviderPasswordResetOtp({
        code: vars.code ?? '',
        expiresMinutes: vars.expiresMinutes ? Number(vars.expiresMinutes) : 15,
      });
    case 'community-join-otp':
      return renderCommunityJoinOtp({
        code: vars.code ?? '',
        expiresMinutes: vars.expiresMinutes ? Number(vars.expiresMinutes) : 10,
      });
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown template: ${_exhaustive}`);
    }
  }
}
