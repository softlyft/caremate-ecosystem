import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { APP_STORE_URLS, BRAND, CORE_FEATURES, MINI_APPS, PROVIDER_CAPABILITIES } from '@/lib/brand';
import styles from './Welcome.module.css';

export function WelcomePage() {
  return (
    <main>
      <section className={styles.hero} aria-labelledby="welcome-heading">
        <div className={styles.heroAtmosphere} aria-hidden="true" />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.brandMark}>
              <img src="/caremate-splash-icon.png" alt="" width={48} height={48} />
              <span>{BRAND.name}</span>
            </p>
            <h1 id="welcome-heading" className={styles.headline}>
              Health tools that keep working when the signal does not.
            </h1>
            <p className={styles.support}>
              CareMate is your offline-first companion for emergencies, nearby care, trusted
              reading, and personal trackers — and a trusted channel for the care organizations
              patients connect with.
            </p>
            <div className={styles.ctaGroup}>
              <a className={styles.ctaPrimary} href={APP_STORE_URLS.ios}>
                Download for iOS
              </a>
              <a className={styles.ctaSecondary} href={APP_STORE_URLS.android}>
                Get it on Android
              </a>
            </div>
            <div className={styles.heroJumps}>
              <a className={styles.heroJump} href="#core">
                See what is inside
              </a>
              <Link className={styles.heroJump} to="/guide">
                Patient guide
              </Link>
              <Link className={styles.heroJump} to="/ccn">
                Community Network
              </Link>
              <Link className={styles.heroJump} to="/providers">
                For providers
              </Link>
            </div>
          </div>

          <div className={styles.heroStage} aria-hidden="true">
            <div className={styles.phone}>
              <div className={styles.phoneBezel}>
                <img
                  src="/caremate-homepage.png"
                  alt=""
                  width={390}
                  height={844}
                  className={styles.phoneScreen}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.strip} aria-label="Product highlights">
        <div className={styles.stripInner}>
          <p>
            <strong>Offline-first</strong>
            Essentials stay on your phone
          </p>
          <p>
            <strong>Guest-friendly</strong>
            Explore before you create an account
          </p>
          <p>
            <strong>Signed-in sync</strong>
            Backup and family tools when you are ready
          </p>
        </div>
      </section>

      <section id="core" className={styles.section} aria-labelledby="core-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Core app</p>
          <h2 id="core-heading">Everyday CareMate</h2>
          <p className={styles.sectionLead}>
            The main tabs cover the moments that matter most — from an emergency card you can open
            without the internet, to finding care nearby and reading health content you trust.
          </p>
        </div>

        <div className={styles.coreList}>
          {CORE_FEATURES.map((feature, index) => (
            <article
              key={feature.id}
              className={styles.coreItem}
              style={
                {
                  '--accent': feature.accent,
                  '--soft': feature.soft,
                  '--delay': `${index * 40}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.coreIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.coreBody}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="tools" className={styles.sectionAlt} aria-labelledby="tools-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Mini-apps</p>
          <h2 id="tools-heading">Personal health tools</h2>
          <p className={styles.sectionLead}>
            Sign in to unlock focused trackers inside the Apps tab. Each tool works offline and can
            sync as a snapshot when you are connected.
          </p>
        </div>

        <div className={styles.miniGrid}>
          {MINI_APPS.map((app) => (
            <article
              key={app.id}
              className={styles.miniItem}
              style={{ '--accent': app.accent, '--soft': app.soft } as CSSProperties}
            >
              <div className={styles.miniSwatch} aria-hidden="true" />
              <h3>{app.name}</h3>
              <p>{app.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="providers" className={styles.section} aria-labelledby="providers-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Healthcare organizations</p>
          <h2 id="providers-heading">CareMate for providers</h2>
          <p className={styles.sectionLead}>
            Hospitals, clinics, pharmacies, and labs keep their own systems. The Provider Portal is
            how they connect with CareMate patients — connections, documents, broadcasts, and
            appointment requests. Not an EHR.
          </p>
        </div>

        <div className={styles.coreList}>
          {PROVIDER_CAPABILITIES.map((item, index) => (
            <article
              key={item.id}
              className={styles.coreItem}
              style={
                {
                  '--accent': item.accent,
                  '--soft': item.soft,
                  '--delay': `${index * 40}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.coreIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.coreBody}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.providerCtas}>
          <Link className={styles.providerCtaPrimary} to="/providers">
            Explore for providers
          </Link>
          <Link className={styles.providerCtaSecondary} to="/providers/guide">
            Provider guide
          </Link>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="flow-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="flow-heading">Start light. Go deeper when you need to.</h2>
        </div>
        <ol className={styles.steps}>
          <li>
            <strong>Open as a guest</strong>
            <span>Browse Learn, Nearby, and your emergency card without signing up.</span>
          </li>
          <li>
            <strong>Create a free account</strong>
            <span>Unlock mini-apps, sync, Patient ID, and family setup.</span>
          </li>
          <li>
            <strong>Upgrade when it helps</strong>
            <span>Premium expands medication, checkup, immunization, and family limits.</span>
          </li>
        </ol>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading">
        <div className={styles.closingInner}>
          <img src="/caremate-logo-header.png" alt={BRAND.name} className={styles.closingLogo} />
          <h2 id="closing-heading">Carry your health context with you.</h2>
          <p>
            Download CareMate and keep emergency details, care discovery, and personal trackers in
            one place — ready even when you are offline.
          </p>
          <div className={styles.ctaGroup}>
            <a className={styles.ctaPrimaryDark} href={APP_STORE_URLS.ios}>
              Download for iOS
            </a>
            <a className={styles.ctaSecondaryDark} href={APP_STORE_URLS.android}>
              Get it on Android
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
