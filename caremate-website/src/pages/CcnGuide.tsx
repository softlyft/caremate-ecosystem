import { Link } from 'react-router-dom';

import { BRAND, COMMUNITY_GROUPS, COMMUNITY_URLS } from '@/lib/brand';
import styles from './Guide.module.css';

export function CcnGuidePage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Community guide</p>
        <h1>How to join the {BRAND.name} Community Network</h1>
        <p className={styles.lead}>
          A plain-language walkthrough for CareMate users who want to help grow Africa&apos;s
          Personal Health Integration Network — who can join, how enrollment works, what
          contributors do, and how recognition works.
        </p>

        <nav className={styles.toc} aria-label="Guide contents">
          <p className={styles.tocTitle}>On this page</p>
          <a href="#what">What the network is</a>
          <a href="#who">Who can join</a>
          <a href="#join">How to enroll</a>
          <a href="#groups">Contributor groups</a>
          <a href="#portal">What you can do after joining</a>
          <a href="#recognition">Recognition</a>
          <a href="#conduct">Community expectations</a>
          <a href="#safety">Important to know</a>
        </nav>

        <h2 id="what">What the network is</h2>
        <p>
          The CareMate Community Network (CCN) is a contributor community — not a separate product
          account and not paid advertising. Members help CareMate grow through trust: introducing
          families, hosting awareness events, improving health education, building features, and
          helping healthcare organizations adopt CareMate.
        </p>
        <p>
          Marketing pages live on the CareMate website at <Link to="/ccn">/ccn</Link>. Day-to-day
          community tools live in the Community Portal. SoftLyft staff manage chapters and awards
          from the admin portal.
        </p>

        <h2 id="who">Who can join</h2>
        <p>
          Enrollment is limited to people who already have a CareMate app account with a generated
          CareMate Patient ID. There is no open signup on the Community Portal.
        </p>
        <ul className={styles.list}>
          <li>Students, NYSC members, community leaders, and passionate CareMate users</li>
          <li>Healthcare professionals who want to improve trusted health content</li>
          <li>Developers, designers, researchers, and technical writers</li>
          <li>People who work inside hospitals, clinics, pharmacies, labs, HMOs, and NGOs</li>
        </ul>
        <p className={styles.note}>
          You do not need to be a healthcare professional. Contribute at a pace that works for you.
        </p>

        <h2 id="join">How to enroll</h2>
        <ol className={styles.steps}>
          <li>
            In the CareMate app, open <strong>Me</strong> and confirm you have a CareMate Patient
            ID (generate one if needed).
          </li>
          <li>
            Open the Community Portal join page (
            <a href={COMMUNITY_URLS.join}>{COMMUNITY_URLS.joinHost}/join</a>) — or start from{' '}
            <Link to="/ccn">{COMMUNITY_URLS.marketingHost}/ccn</Link> and tap Join.
          </li>
          <li>Enter your 12-digit CareMate Patient ID.</li>
          <li>
            Enter the six-digit verification code sent to the email on your CareMate profile. While
            email delivery is still rolling out, the portal may also display the code on screen for
            testing.
          </li>
          <li>
            Choose an <strong>active chapter</strong> that SoftLyft or community admins have already
            created. Members do not create chapters from join.
          </li>
          <li>
            Membership activates immediately. Sign in to the Community Portal with the same CareMate
            email and password you use in the app.
          </li>
        </ol>
        <p className={styles.note}>
          Community membership does not copy your name, phone, or other profile fields. The portal
          reads your existing CareMate profile.
        </p>

        <h2 id="groups">Contributor groups</h2>
        <p>Members can contribute in one group or across several as their interests evolve.</p>
        <ul className={styles.list}>
          {COMMUNITY_GROUPS.map((group) => (
            <li key={group.id}>
              <strong>{group.title}</strong> — {group.description}
            </li>
          ))}
        </ul>

        <h2 id="portal">What you can do after joining</h2>
        <ul className={styles.list}>
          <li>
            <strong>Dashboard</strong> — see your chapter, upcoming events, announcements, and
            points.
          </li>
          <li>
            <strong>Community hub</strong> — chapter info, gallery, announcements, and leaderboard.
          </li>
          <li>
            <strong>Events</strong> — register for chapter events; cancel if plans change.
          </li>
          <li>
            <strong>Resources</strong> — search and download community materials.
          </li>
          <li>
            <strong>Recognition</strong> — view badges, certificates, and milestones you have
            earned.
          </li>
          <li>
            <strong>Profile</strong> — see your CareMate identity (read-only here) and contribution
            history.
          </li>
        </ul>
        <h3>Chapter leads and deputies</h3>
        <p>
          Leads and deputies can manage chapter tools such as membership reviews (when pending
          requests exist), events, attendance export, announcements, and gallery uploads from
          Leader tools.
        </p>

        <h2 id="recognition">Recognition</h2>
        <p>
          The Community Network is mission-driven. Contributors are recognized through impact —
          not paid for app installs.
        </p>
        <ul className={styles.list}>
          <li>Contribution points for actions such as joining, event registration, and attendance</li>
          <li>Chapter and national (country) leaderboards</li>
          <li>Digital badges and certificates awarded by SoftLyft staff</li>
          <li>Public appreciation, leadership opportunities, and annual community awards</li>
        </ul>

        <h2 id="conduct">Community expectations</h2>
        <ul className={styles.list}>
          <li>Treat everyone with respect and welcome diverse perspectives.</li>
          <li>Communicate professionally and protect user privacy.</li>
          <li>Never share private patient information or spread medical misinformation.</li>
          <li>
            For health content, reference credible sources and escalate clinical questions to
            qualified professionals.
          </li>
          <li>
            Represent CareMate truthfully — no exaggerated claims or promises of unavailable
            features.
          </li>
        </ul>

        <h2 id="safety">Important to know</h2>
        <p className={styles.callout}>
          <strong>Community contributions support CareMate; they are not clinical care.</strong>{' '}
          Do not diagnose, prescribe, or replace emergency services when helping others discover
          CareMate or health education.
        </p>
        <ul className={styles.list}>
          <li>
            Chapters are curated by SoftLyft. If no chapter appears for your area yet, check back
            after an admin creates one.
          </li>
          <li>
            Use the same CareMate account everywhere — mobile app, Community Portal, and (for
            organizations) Provider Portal claim flows are separate products with different roles.
          </li>
          <li>
            For chapter setup, awards, or portal access issues, contact SoftLyft — the team that
            operates CareMate.
          </li>
        </ul>

        <p className={styles.meta}>Last updated: July 21, 2026</p>
        <p className={styles.back}>
          <Link to="/ccn">← Back to Community Network</Link>
          {' · '}
          <Link to="/guide">Patient guide</Link>
          {' · '}
          <a href={COMMUNITY_URLS.join}>Join now</a>
        </p>
      </article>
    </main>
  );
}
