import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  renderBillingActivated,
  renderBillingPaymentFailed,
  renderBillingRenewal,
  renderEmailTemplate,
  renderFamilyConnectionRequest,
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

  it('dispatches via renderEmailTemplate', () => {
    const mail = renderEmailTemplate('family-connection-request', { fromName: 'Grace' });
    assert.equal(mail.subject.includes('Grace'), true);
    assert.match(mail.html, /getcaremate\.com\/privacy/);
    assert.match(mail.html, /getcaremate\.com\/terms/);
  });
});
