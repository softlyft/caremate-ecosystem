import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import {
  BRAND,
  COMMUNITY_GROUPS,
  COMMUNITY_JOIN_STEPS,
  COMMUNITY_URLS,
} from '@/lib/brand';
import styles from './Ccn.module.css';

export function CcnPage() {
  return (
    <main>
      <section className={styles.hero} aria-labelledby="ccn-heading">
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>CareMate Community Network</p>
          <h1 id="ccn-heading">Help build Africa&apos;s Personal Health Integration Network</h1>
          <p className={styles.lead}>
            CareMate is more than an app. It is a movement of people who believe healthcare should
            be connected, accessible, and centered around individuals. The Community Network is how
            that movement grows — through trust, not advertising.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href={COMMUNITY_URLS.join}>
              Join the network
            </a>
            <Link className={styles.ctaSecondary} to="/ccn/guide">
              Read the community guide
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.strip} aria-label="Why community matters">
        <div className={styles.stripInner}>
          <p>
            <strong>Trust before growth</strong>
            People choose health tools because someone they trust introduced them
          </p>
          <p>
            <strong>Anyone can join</strong>
            Students, clinicians, builders, partners, and passionate CareMate users
          </p>
          <p>
            <strong>Every contribution matters</strong>
            Families onboarded, providers connected, articles reviewed, bugs fixed
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mission-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Mission</p>
          <h2 id="mission-heading">Empower every person with connected care</h2>
          <p className={styles.sectionLead}>
            We are building Africa&apos;s trusted Personal Health Integration Network — connecting
            people, healthcare providers, and health information into one continuous care
            experience. Community members are not a support function for marketing. The community
            is how CareMate grows.
          </p>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="groups-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Contributor groups</p>
          <h2 id="groups-heading">Find the path that fits your skills</h2>
          <p className={styles.sectionLead}>
            Contribute in one group or across several. Recognition comes through impact —
            certificates, badges, leadership opportunities, and community awards — not pay for
            installs.
          </p>
        </div>

        <div className={styles.capList}>
          {COMMUNITY_GROUPS.map((group, index) => (
            <article
              key={group.id}
              className={styles.capItem}
              style={
                {
                  '--accent': group.accent,
                  '--soft': group.soft,
                  '--delay': `${index * 40}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.capIndex}>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className={styles.section} aria-labelledby="how-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>How to join</p>
          <h2 id="how-heading">Three steps to start contributing</h2>
          <p className={styles.sectionLead}>
            Membership is for registered CareMate app users. Chapters are created by CareMate —
            you verify your Patient ID, pick a chapter, and join.
          </p>
        </div>
        <ol className={styles.steps}>
          {COMMUNITY_JOIN_STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.description}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading">
        <div className={styles.closingInner}>
          <p className={styles.eyebrow}>Next step</p>
          <h2 id="closing-heading">Ready to join the movement?</h2>
          <p>
            Every family introduced, every provider connected, and every contribution shared makes
            healthcare more continuous for someone. Start with your CareMate Patient ID and choose
            a chapter near you.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimaryDark} href={COMMUNITY_URLS.join}>
              Join CareMate Community
            </a>
            <Link className={styles.ctaSecondaryDark} to="/ccn/guide">
              Community guide
            </Link>
          </div>
          <p className={styles.footnote}>
            {BRAND.name} Community Network is operated by SoftLyft. You will need an existing
            CareMate account and Patient ID to enroll.
          </p>
        </div>
      </section>
    </main>
  );
}
