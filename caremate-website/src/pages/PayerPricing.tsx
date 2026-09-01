import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useOrgPlanCatalog } from '@/hooks/use-org-plan-catalog';
import { CARE_PORTAL_URL } from '@/lib/brand';
import styles from './Pricing.module.css';

export function PayerPricingPage() {
  const [searchParams] = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const { plans, status } = useOrgPlanCatalog('payer');

  const claimUrl = `${CARE_PORTAL_URL}/claim?kind=payer`;
  const billingUrl = `${CARE_PORTAL_URL}/payer/settings/billing`;
  const contactHref = 'mailto:hello@getcaremate.com?subject=Payer%20Support%20Team%20Enterprise';

  return (
    <main>
      <section className={styles.hero} aria-labelledby="payer-pricing-heading">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>For health insurers & payers</p>
          <h1 id="payer-pricing-heading">Payer Support Team plans</h1>
          <p className={styles.lead}>
            Message connected patients from your organization inbox at no charge. Subscribe to
            Support Team so designated staff can chat 1:1 with patients in CareMate — text and
            voice only (no video). Billed in Naira via Paystack — separate from{' '}
            <Link to="/providers/pricing">provider Care Portal plans</Link> and{' '}
            <Link to="/pricing">patient Premium</Link>.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="#payer-plans">
              Compare plans
            </a>
            <a className={styles.ctaSecondary} href={claimUrl}>
              Claim your organization
            </a>
          </div>
        </div>
      </section>

      {paid ? (
        <p className={styles.paidNotice} role="status">
          Payment received. Open Care Portal → Payer Settings → Billing to confirm your Support Team
          entitlement.
        </p>
      ) : null}

      <section id="payer-plans" className={styles.section} aria-labelledby="plans-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Support Team</p>
          <h2 id="plans-heading">Monthly or yearly</h2>
          <p className={styles.sectionLead}>
            Checkout runs in Care Portal after you claim or sign in as a payer organization owner or
            administrator. Prices are loaded from the SoftLyft admin catalog (same source as
            checkout). Seat, provider, and patient limits are shown as included with each plan.
          </p>
          {status === 'loading' ? (
            <p className={styles.sectionLead} role="status">
              Loading current prices…
            </p>
          ) : null}
          {status === 'error' ? (
            <p className={styles.sectionLead} role="status">
              Showing last-known prices. Refresh the page or contact SoftLyft if amounts look wrong.
            </p>
          ) : null}
        </div>

        <div className={styles.controls}>
          <div className={styles.toggle} role="group" aria-label="Billing interval">
            <button
              type="button"
              className={billing === 'monthly' ? styles.toggleActive : undefined}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === 'yearly' ? styles.toggleActive : undefined}
              onClick={() => setBilling('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className={styles.planGrid}>
          {plans.map((plan) => {
            const price =
              billing === 'yearly' ? plan.yearlyDisplay : plan.monthlyDisplay;
            const href =
              plan.cta === 'contact'
                ? contactHref
                : plan.cta === 'claim'
                  ? claimUrl
                  : billingUrl;
            const ctaLabel =
              plan.cta === 'contact'
                ? 'Contact CareMate team'
                : plan.cta === 'claim'
                  ? 'Start free'
                  : 'Upgrade in Care Portal';

            return (
              <article
                key={plan.id}
                className={plan.featured ? `${styles.planCard} ${styles.planFeatured}` : styles.planCard}
              >
                <h3>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
                <p className={styles.planPrice}>
                  <span className={styles.planAmount}>{price}</span>
                  {plan.id !== 'enterprise' && plan.id !== 'free' ? (
                    <span className={styles.planPeriod}>
                      / {billing === 'yearly' ? 'year' : 'month'}
                    </span>
                  ) : null}
                </p>
                <ul className={styles.featureList}>
                  <li>{plan.seats}</li>
                  <li>{plan.providers}</li>
                  <li>{plan.patients}</li>
                </ul>
                <a
                  className={plan.featured ? styles.ctaPrimary : styles.ctaSecondary}
                  href={href}
                >
                  {ctaLabel}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2>How it works</h2>
          <p className={styles.sectionLead}>
            Org-wide Messages never require a paid plan. Mark connected users as staff, then add them
            to Support Team within your seat limit so patients can find them for 1:1 chat. Pro adds
            tri-party group chat between patient, payer, and provider — plus future workflows,
            eligibility/benefits, and claims integration.
          </p>
          <p className={styles.sectionLead}>
            Healthcare providers? See{' '}
            <Link to="/providers/pricing">Care Portal provider plans</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
