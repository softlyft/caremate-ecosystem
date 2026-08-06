import { Link } from 'react-router-dom';

import styles from './Legal.module.css';

export function RefundsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Legal</p>
        <h1>Refund policy</h1>
        <p className={styles.lead}>
          This policy explains how refunds, cancellations, and billing disputes work for paid CareMate
          plans (CareMate Premium and CareMate Family). It applies to purchases made through
          CareMate&apos;s hosted checkout (Paystack for Naira, Stripe for international USD) unless
          a different flow is shown at purchase.
        </p>

        <h2>Free plan</h2>
        <p>
          The CareMate Free plan does not charge a subscription fee. This refund policy does not
          apply to Free.
        </p>

        <h2>Subscriptions and auto-renewal</h2>
        <p>
          Paid plans renew automatically at the end of each billing period (monthly or annual) unless
          you cancel before the renewal date. Current pricing is on our{' '}
          <Link to="/pricing">Pricing</Link> page. By subscribing you authorize SoftLyft to charge
          the payment method you provide for recurring fees shown at checkout.
        </p>

        <h2>Cancelling</h2>
        <p>
          You can cancel auto-renewal at any time from the CareMate app under{' '}
          <strong>Me → Premium</strong> (or by contacting us — see below). Cancellation stops
          future charges. You keep Premium or Family access until the end of the current paid
          period; we do not usually refund unused time after cancellation unless this policy or
          applicable law requires it.
        </p>

        <h2>Refunds</h2>
        <p>
          CareMate sells digital subscriptions. Except where required by law, fees are generally
          non-refundable once a billing period has started.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>First-time purchase (7 days)</strong> — If this is your first paid CareMate
            subscription on that account and you contact us within 7 days of the initial charge, we
            will refund that first payment in full. This does not apply to renewals or plan changes.
          </li>
          <li>
            <strong>Billing errors and duplicate charges</strong> — We will refund verified mistaken
            or duplicate charges.
          </li>
          <li>
            <strong>Service not delivered</strong> — If a payment succeeded but Premium was not
            activated within a reasonable time and we cannot fix it promptly, we will refund that
            payment or extend your access — your choice.
          </li>
          <li>
            <strong>Annual plans</strong> — After the 7-day first-purchase window, annual
            subscriptions are not partially refunded for unused months unless required by law.
          </li>
          <li>
            <strong>Upgrades</strong> — When you upgrade (for example Standard to Family), checkout
            may apply a credit toward the new plan. Refunds for upgrade transactions follow the same
            rules as other paid charges unless checkout copy states otherwise.
          </li>
        </ul>

        <h2>How to request a refund</h2>
        <p>
          Email{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a> from the address on your
          CareMate account. Include your CareMate Patient ID (if available), the date and amount of
          the charge, and a brief reason. We aim to respond within a few business days. Approved
          refunds are returned to the original payment method; timing depends on your bank or card
          issuer (often 5–10 business days).
        </p>

        <h2>Chargebacks</h2>
        <p>
          If you believe a charge is wrong, contact us first so we can resolve it quickly. Filing a
          chargeback without contacting us may delay access while the dispute is investigated.
        </p>

        <h2>Regional rights</h2>
        <p>
          Nothing in this policy limits mandatory consumer rights in your country (for example
          certain cancellation or refund rights under local law). Where law gives you a right we
          have not described here, that right applies.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date below
          shows when it last changed. Material changes will be reflected on this page; continued use
          of a paid plan after an update constitutes acceptance of the revised policy for future
          billing.
        </p>

        <h2>Related policies</h2>
        <p>
          See also our <Link to="/terms">Terms of service</Link> and{' '}
          <Link to="/privacy">Privacy policy</Link>.
        </p>

        <h2>Contact</h2>
        <p>
          Billing and refund questions:{' '}
          <a href="mailto:hello@getcaremate.com">hello@getcaremate.com</a>
        </p>

        <p className={styles.meta}>Last updated: August 6, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
          {' · '}
          <Link to="/pricing">Pricing</Link>
        </p>
      </article>
    </main>
  );
}
