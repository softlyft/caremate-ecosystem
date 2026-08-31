import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  renderBillingActivated,
  renderBillingPaymentFailed,
  renderBillingRenewal,
  renderCommunityJoinOtp,
  renderEmailTemplate,
  renderFamilyConnectionRequest,
  renderProviderOrgClaimOtp,
} from './index.ts';

describe('email templates', () => {
  it('renders family connection request with escaped name and branding', () => {
    const mail = renderFamilyConnectionRequest({ fromName: 'Ada <script>' });
    assert.match(mail.subject, /Ada/);
    assert.match(mail.html, /Ada &lt;script&gt;/);
    assert.match(mail.text, /Ada <script>/);
    assert.match(mail.text, /Family/);
    assert.match(mail.html, /caremate-logo\.png/);
    assert.match(mail.html, /Open CareMate Family/);
    assert.match(mail.html, /hello@getcaremate\.com/);
    assert.match(mail.html, /Your Health\. Our Priority/);
    assert.match(mail.html, /#0d9488/);
    assert.match(mail.html, /www\.getcaremate\.com/);
  });

  it('renders billing activated and renewal with tone panels', () => {
    const activated = renderBillingActivated({
      planLabel: 'Standard Premium',
      periodEnd: '1 Aug 2026',
    });
    assert.match(activated.subject, /active/i);
    assert.match(activated.html, /Standard Premium/);
    assert.match(activated.html, /View Premium in CareMate/);
    assert.match(activated.html, /#f0fdfa/);

    const renewal = renderBillingRenewal({
      planLabel: 'Family Premium',
      periodEnd: '1 Aug 2026',
    });
    assert.match(renewal.subject, /renews/i);
    assert.match(renewal.text, /1 Aug 2026/);
    assert.match(renewal.html, /Review your plan/);
    assert.match(renewal.html, /#fff7ed/);
  });

  it('renders payment failed with optional reason and danger tone', () => {
    const mail = renderBillingPaymentFailed({
      planLabel: 'Standard Premium',
      reason: 'card_declined',
    });
    assert.match(mail.subject, /failed/i);
    assert.match(mail.html, /card_declined/);
    assert.match(mail.html, /Update payment in CareMate/);
    assert.match(mail.html, /#fef2f2/);
    assert.match(mail.html, /#b91c1c/);
  });

  it('renders provider org claim OTP with code and branding', () => {
    const mail = renderProviderOrgClaimOtp({
      code: '482913',
      orgName: 'Lagos Clinic <script>',
      expiresMinutes: 15,
    });
    assert.match(mail.subject, /verification code/i);
    assert.match(mail.html, /482913/);
    assert.match(mail.html, /Lagos Clinic &lt;script&gt;/);
    assert.match(mail.text, /482913/);
    assert.match(mail.html, /Care Portal/);
    assert.match(mail.html, /provider\.getcaremate\.com\/claim/);
  });

  it('renders payer claim OTP with Care Portal branding', () => {
    const mail = renderProviderOrgClaimOtp({
      code: '991122',
      orgName: 'Demo Payer',
      orgKind: 'payer',
      expiresMinutes: 10,
    });
    assert.match(mail.subject, /payer verification code/i);
    assert.match(mail.html, /991122/);
    assert.match(mail.html, /Care Portal/);
  });

  it('renders community join OTP with code and join CTA', () => {
    const mail = renderCommunityJoinOtp({ code: '773301', expiresMinutes: 10 });
    assert.match(mail.subject, /community verification code/i);
    assert.match(mail.html, /773301/);
    assert.match(mail.text, /773301/);
    assert.match(mail.html, /community\.getcaremate\.com\/join/);
  });

  it('dispatches via renderEmailTemplate', () => {
    const mail = renderEmailTemplate('family-connection-request', { fromName: 'Grace' });
    assert.equal(mail.subject.includes('Grace'), true);
    assert.match(mail.html, /www\.getcaremate\.com\/privacy/);
    assert.match(mail.html, /www\.getcaremate\.com\/terms/);

    const otp = renderEmailTemplate('provider-org-claim-otp', {
      code: '111222',
      orgName: 'Demo Org',
    });
    assert.match(otp.html, /111222/);

    const reset = renderEmailTemplate('provider-password-reset-otp', {
      code: '654321',
    });
    assert.match(reset.html, /654321/);
    assert.match(reset.subject, /password reset/i);
    assert.match(reset.html, /provider\.getcaremate\.com\/forgot-password/);

    const join = renderEmailTemplate('community-join-otp', { code: '998877' });
    assert.match(join.html, /998877/);
  });
});
