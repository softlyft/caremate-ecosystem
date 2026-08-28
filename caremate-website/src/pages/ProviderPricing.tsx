import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { BRAND, CARE_PORTAL_URL } from '@/lib/brand';
import { PROVIDER_PLANS } from '@/lib/provider-pricing';
import styles from './Pricing.module.css';

export function ProviderPricingPage() {
  const [searchParams] = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  const claimUrl = `${CARE_PORTAL_URL}/claim`;
  const billingUrl = `${CARE_PORTAL_URL}/app/settings/billing`;
  const contactHref = 'mailto:hello@getcaremate.com?subject=Care%20Portal%20Enterprise';

  return (
    <main>
      <section className={styles.hero} aria-labelledby="provider-pricing-heading">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>For healthcare providers</p>
          <h1 id="provider-pricing-heading">Care Portal plans</h1>
          <p className={styles.lead}>
            Message connected patients from your organization inbox at no charge. Subscribe to
            Private Care Team so designated staff can chat 1:1 with patients in CareMate. Billed in
            Naira via Paystack — separate from patient Premium on{' '}
            <Link to="/pricing">app pricing</Link>.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="#provider-plans">
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
          Payment received. Open Care Portal → Settings → Billing to confirm your Private Care Team
          entitlement.
        </p>
      ) : null}

      <section id="provider-plans" className={styles.section} aria-labelledby="plans-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Private Care Team</p>
          <h2 id="plans-heading">Monthly or yearly</h2>
          <p className={styles.sectionLead}>
            Checkout runs in Care Portal after you claim or sign in as an organization owner or
            administrator. Amounts below match the SoftLyft catalog defaults and may be updated by
            SoftLyft.
          </p>
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
          {PROVIDER_PLANS.map((plan) => {
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
                ? 'Contact SoftLyft'
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
                  <li>{plan.patients}</li>
                  <li>{plan.chat}</li>
                  <li>{plan.voiceVideo}</li>
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
            to Private Care Team within your seat limit so patients can find them for 1:1 chat.
          </p>
          <p className={styles.sectionLead}>
            Looking for patient app plans? See <Link to="/pricing">{BRAND.name} pricing</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
