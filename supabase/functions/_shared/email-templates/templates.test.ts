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
  it('renders family connection request with escaped name', () => {
    const mail = renderFamilyConnectionRequest({ fromName: 'Ada <script>' });
    assert.match(mail.subject, /Ada/);
    assert.match(mail.html, /Ada &lt;script&gt;/);
    assert.match(mail.text, /Ada <script>/);
    assert.match(mail.text, /Family/);
  });

  it('renders billing activated and renewal', () => {
    const activated = renderBillingActivated({
      planLabel: 'Standard Premium',
      periodEnd: '1 Aug 2026',
    });
    assert.match(activated.subject, /active/i);
    assert.match(activated.html, /Standard Premium/);

    const renewal = renderBillingRenewal({
      planLabel: 'Family Premium',
      periodEnd: '1 Aug 2026',
    });
    assert.match(renewal.subject, /renews/i);
    assert.match(renewal.text, /1 Aug 2026/);
  });

  it('renders payment failed with optional reason', () => {
    const mail = renderBillingPaymentFailed({
      planLabel: 'Standard Premium',
      reason: 'card_declined',
    });
    assert.match(mail.subject, /failed/i);
    assert.match(mail.html, /card_declined/);
  });

  it('dispatches via renderEmailTemplate', () => {
    const mail = renderEmailTemplate('family-connection-request', { fromName: 'Grace' });
    assert.equal(mail.subject.includes('Grace'), true);
  });
});
