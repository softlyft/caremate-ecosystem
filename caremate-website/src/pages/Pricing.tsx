import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { APP_STORE_URLS, BRAND, PAYMENT_URL, SITE_URL } from '@/lib/brand';
import {
  CONSUMER_PLANS,
  PRICING_PRINCIPLES,
  PRICING_REGIONS,
  PRICING_VALUE_PILLARS,
  buildCheckoutUrl,
  checkoutCurrency,
  checkoutInterval,
  checkoutPlanType,
  type PricingRegion,
} from '@/lib/pricing';
import styles from './Pricing.module.css';

export function PricingPage() {
  const [searchParams] = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const [region, setRegion] = useState<PricingRegion>('ng');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  return (
    <main>
      <section className={styles.hero} aria-labelledby="pricing-heading">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>For CareMate app users</p>
          <h1 id="pricing-heading">{BRAND.name} pricing</h1>
          <p className={styles.lead}>
            Simple plans that put trust and adoption first. Start free, upgrade when deeper insights,
            documents, and family coordination will help — not because another screen is locked.
            Pay here with Paystack (Naira) or Stripe (USD). The same account unlocks Premium in the
            CareMate app.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="#plans">
              Compare plans
            </a>
            <a className={styles.ctaSecondary} href={APP_STORE_URLS.android}>
              Get the app
            </a>
          </div>
        </div>
      </section>

      {paid ? (
        <p className={styles.paidNotice} role="status">
          Payment received. Open the CareMate app and sign in with the same account to use Premium.
        </p>
      ) : null}

      <section className={styles.strip} aria-label="Pricing principles">
        <div className={styles.stripInner}>
          {PRICING_PRINCIPLES.map((item) => (
            <p key={item.title}>
              <strong>{item.title}</strong>
              {item.description}
            </p>
          ))}
        </div>
      </section>

      <section id="plans" className={styles.section} aria-labelledby="plans-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Launch pricing</p>
          <h2 id="plans-heading">Choose what fits your household</h2>
          <p className={styles.sectionLead}>
            Nigeria is billed in Naira. Until localized pricing launches elsewhere, international
            users are billed in USD. Annual plans include roughly two months free.
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.toggle} role="group" aria-label="Pricing region">
            {PRICING_REGIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={region === item.id ? styles.toggleActive : undefined}
                aria-pressed={region === item.id}
                onClick={() => setRegion(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.toggle} role="group" aria-label="Billing period">
            <button
              type="button"
              className={billing === 'monthly' ? styles.toggleActive : undefined}
              aria-pressed={billing === 'monthly'}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === 'annual' ? styles.toggleActive : undefined}
              aria-pressed={billing === 'annual'}
              onClick={() => setBilling('annual')}
            >
              Annual
            </button>
          </div>
        </div>
        <p className={styles.regionHint}>
          {PRICING_REGIONS.find((item) => item.id === region)?.hint}
        </p>

        <div className={styles.planGrid}>
          {CONSUMER_PLANS.map((plan) => {
            const price = plan.prices[region];
            const amount = billing === 'monthly' ? price.monthly : price.annual;
            const period = billing === 'monthly' ? '/ month' : '/ year';
            const note = billing === 'annual' ? price.annualNote : price.monthlyNote;

            const checkoutPlan = checkoutPlanType(plan.id);
            const checkoutHref = checkoutPlan
              ? buildCheckoutUrl({
                  paymentUrl: PAYMENT_URL,
                  siteUrl: SITE_URL,
                  planType: checkoutPlan,
                  billingInterval: checkoutInterval(billing),
                  currency: checkoutCurrency(region),
                })
              : APP_STORE_URLS.android;

            return (
              <article
                key={plan.id}
                className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`}
              >
                {plan.featured ? <p className={styles.planBadge}>Most popular</p> : null}
                <h3>{plan.name}</h3>
                <p className={styles.planTagline}>{plan.tagline}</p>
                <p className={styles.planPrice}>
                  <span className={styles.planAmount}>{amount}</span>
                  <span className={styles.planPeriod}>{period}</span>
                </p>
                {note ? <p className={styles.planNote}>{note}</p> : <p className={styles.planNoteSpacer} />}
                <p className={styles.includesLabel}>{plan.includesLabel}</p>
                <ul className={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a
                  className={plan.featured ? styles.planCtaPrimary : styles.planCtaSecondary}
                  href={checkoutHref}
                >
                  {plan.id === 'free'
                    ? 'Start free in the app'
                    : checkoutPlan === 'family'
                      ? 'Subscribe to Family'
                      : 'Subscribe with Paystack / Stripe'}
                </a>
                {checkoutPlan === 'family' ? (
                  <p className={styles.planNote}>
                    Family checkout needs a household already set up in the CareMate app.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="value-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>What you are buying</p>
          <h2 id="value-heading">Not more screens — better decisions</h2>
          <p className={styles.sectionLead}>
            CareMate is not selling additional features for their own sake. People subscribe because
            CareMate helps them make better healthcare decisions. See our{' '}
            <Link to="/refunds">Refund policy</Link> for cancellations and refunds.
          </p>
        </div>
        <ul className={styles.valueList}>
          {PRICING_VALUE_PILLARS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading">
        <div className={styles.closingInner}>
          <p className={styles.eyebrowLight}>Guiding principle</p>
          <h2 id="closing-heading">Trust first. Adoption second. Revenue third.</h2>
          <p>
            If CareMate becomes an indispensable part of your healthcare journey, sustainable
            support for the product follows. Subscribe on this page with Paystack or Stripe, or in
            the CareMate app through Apple or Google billing. Either way, Premium unlocks on the
            same account.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimaryDark} href={APP_STORE_URLS.ios}>
              Download for iOS
            </a>
            <a className={styles.ctaSecondaryDark} href={APP_STORE_URLS.android}>
              Get it on Android
            </a>
            <Link className={styles.ctaSecondaryDark} to="/docs/patient">
              Patient guide
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
