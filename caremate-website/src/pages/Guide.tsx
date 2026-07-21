import { Link } from 'react-router-dom';

import { BRAND, CORE_FEATURES, MINI_APPS } from '@/lib/brand';
import styles from './Guide.module.css';

const CORE_HOW_TO: Record<(typeof CORE_FEATURES)[number]['id'], string[]> = {
  emergency: [
    'Open Emergency from Home or Me, then fill blood group, genotype, allergies, medications, conditions, and ICE contacts.',
    'Add a preferred hospital, insurance details, and notes if you want responders to see them.',
    'Your emergency card stays on the device so you can open it offline. On supported phones, a lock-screen or home widget can show the same essentials.',
    'Your scannable Patient ID QR lives on Me (flip the Patient ID card) — useful when someone needs to identify you quickly.',
  ],
  learn: [
    'Use the Learn tab to browse CareMate articles and health news by category, or search from Home.',
    'Open an article to read it. Bookmark pieces you want again, and mark progress as you finish.',
    'Bookmarks and reading history stay on your phone; they sync when you are signed in.',
  ],
  nearby: [
    'Open the Nearby tab (or the nearby row on Home) to find hospitals, pharmacies, labs, and clinics around you.',
    'Open a provider for details, save favorites, and launch Maps for directions. If the organization has claimed CareMate and is verified, signed-in patients can request a connection from the detail screen.',
    'Manage Connected providers and inbound provider requests under Me → Connections.',
    'Results cache on your device after a successful online search, so you can revisit them offline.',
  ],
  family: [
    'On Me, open Family to manage household kids (and spouse connection on Family Premium).',
    'Signed-in profiles get a Patient ID, Preferences (country and language), and Premium options.',
    'Guest mode keeps core browsing local; creating an account unlocks mini-apps, sync, and family tools.',
  ],
};

const MINI_HOW_TO: Record<(typeof MINI_APPS)[number]['id'], string[]> = {
  vitals: [
    'Open Apps → Vitals to see your latest readings.',
    'Log blood pressure, blood sugar, heart rate, temperature, weight, height, oxygen saturation, or respiratory rate as needed.',
  ],
  medication: [
    'Add each medicine with dose times and optional instructions or refill details.',
    'On the home screen of the tool, confirm doses that are due, see what is upcoming, and review what you already took.',
    'Check History for past doses. In-app alerts remind you about due, missed, and refill moments while you use CareMate.',
  ],
  checkup: [
    'Enter date of birth, gender, and region so the checklist matches your profile.',
    'Mark recommended checkups done for this year; browse next year’s plan when you want to plan ahead.',
    'This is educational guidance only — talk with a clinician for personal advice.',
  ],
  immunization: [
    'Add children in Family first; Immunization Tracker uses those profiles.',
    'Follow childhood vaccine schedules, log doses when given, and watch due or overdue items.',
  ],
  pregnancy: [
    'Set your last menstrual period or due date to see week, trimester, and milestones.',
    'Use the daily log for mood, symptoms, kicks, notes, and weight when you want a simple record.',
  ],
  period: [
    'Mark period days on the calendar.',
    'See your current cycle day and a simple prediction for the next period.',
  ],
};

export function GuidePage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Patient guide</p>
        <h1>How to use {BRAND.name}</h1>
        <p className={styles.lead}>
          A plain-language walkthrough of the same features you see on the CareMate welcome page —
          emergency essentials, Learn, Nearby care, family &amp; profile, and the personal health
          mini-apps.
        </p>

        <nav className={styles.toc} aria-label="Guide contents">
          <p className={styles.tocTitle}>On this page</p>
          <a href="#start">Getting started</a>
          <a href="#tabs">The five tabs</a>
          <a href="#core">Core features</a>
          <a href="#tools">Mini-apps</a>
          <a href="#alerts">Notifications</a>
          <a href="#settings">Settings &amp; account</a>
          <a href="#plans">Free and Premium</a>
          <a href="#safety">Important to know</a>
        </nav>

        <h2 id="start">Getting started</h2>
        <ol className={styles.steps}>
          <li>
            Download CareMate and complete a short onboarding (country, language, and a few
            preferences).
          </li>
          <li>
            Continue as a guest to explore Home, Learn, Nearby, and your emergency profile without
            creating an account.
          </li>
          <li>
            When you are ready, register or sign in from Me. That unlocks the Apps tab tools, cloud
            backup when online, Patient ID, and family setup.
          </li>
        </ol>
        <p className={styles.note}>
          CareMate is offline-first: essentials stay on your phone. Signed-in sync backs up selected
          data when you have a connection.
        </p>

        <h2 id="tabs">The five tabs</h2>
        <ul className={styles.list}>
          <li>
            <strong>Home</strong> — greeting, search, daily tip, featured reading, nearby preview,
            emergency shortcut, and the notifications bell.
          </li>
          <li>
            <strong>Learn</strong> — health articles and news by category, with bookmarks and reading
            progress.
          </li>
          <li>
            <strong>Nearby</strong> — hospitals, pharmacies, labs, and clinics around you.
          </li>
          <li>
            <strong>Apps</strong> — personal trackers (sign-in required).
          </li>
          <li>
            <strong>Me</strong> — Patient ID, emergency &amp; family, Premium, and Settings.
          </li>
        </ul>
        <p>
          From Home search you can jump across articles, providers, and tools in one place.
        </p>

        <h2 id="core">Core features</h2>
        <p>These match the “Everyday CareMate” section on the website.</p>
        {CORE_FEATURES.map((feature) => (
          <div key={feature.id}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <ul className={styles.list}>
              {CORE_HOW_TO[feature.id].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ))}

        <h2 id="tools">Mini-apps</h2>
        <p>
          Open the Apps tab after you sign in. Each tool works offline and can sync as a snapshot
          when you are connected.
        </p>
        {MINI_APPS.map((app) => (
          <div key={app.id}>
            <h3>{app.name}</h3>
            <p>{app.description}</p>
            <ul className={styles.list}>
              {MINI_HOW_TO[app.id].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ))}

        <h2 id="alerts">Notifications</h2>
        <ul className={styles.list}>
          <li>
            Tap the bell on Home to open your in-app inbox (family requests, welcome tips, medication
            due/missed/refill reminders, and similar notices).
          </li>
          <li>Opening an item marks it read. Guests keep the inbox on the device only.</li>
          <li>
            Phone push notifications are not required for these reminders today — check CareMate’s
            inbox while you use the app.
          </li>
        </ul>

        <h2 id="settings">Settings &amp; account</h2>
        <p>From Me → Settings you can:</p>
        <ul className={styles.list}>
          <li>Choose theme (follow system or dark).</li>
          <li>Set a notifications preference for when push support is available.</li>
          <li>Update country and language (signed-in) so news and copy match your region.</li>
          <li>
            Open <Link to="/privacy">Privacy</Link> and <Link to="/terms">Terms</Link>.
          </li>
          <li>
            Delete your account permanently (signed-in) — this removes cloud data and wipes local
            account data on that device.
          </li>
        </ul>

        <h2 id="plans">Free and Premium</h2>
        <p>Core Home, Learn, Nearby, and Emergency stay available without Premium.</p>
        <ul className={styles.list}>
          <li>
            <strong>Free</strong> — explore guest features; with an account, use mini-apps with limits
            (for example up to three active medicines, partial checkup and immunization schedules,
            and one child in Family).
          </li>
          <li>
            <strong>Premium</strong> — unlock fuller medication, checkup, and immunization lists,
            remove ads on Premium surfaces, and expand family (more kids and spouse on Family
            Premium).
          </li>
        </ul>
        <p>
          Manage or upgrade from Me → Premium when you are signed in.
        </p>

        <h2 id="safety">Important to know</h2>
        <p className={styles.callout}>
          <strong>CareMate is not a substitute for clinical care.</strong> Articles, tips, checkup
          lists, and trackers are for education and personal organization. They do not diagnose,
          prescribe, or replace emergency services. In a medical emergency, call your local
          emergency number.
        </p>
        <ul className={styles.list}>
          <li>
            Checkup and immunization schedules are approximate baselines — follow your clinician and
            local guidelines for personal decisions.
          </li>
          <li>
            Medication confirmations and in-app reminders help you stay organized; they are not
            pharmacy or doctor orders.
          </li>
          <li>
            Sharing emergency details or a Patient ID QR helps others help you — it does not replace
            calling for help.
          </li>
        </ul>

        <p className={styles.meta}>Last updated: July 18, 2026</p>
        <p className={styles.back}>
          <Link to="/">← Back to CareMate</Link>
          {' · '}
          <Link to="/ccn/guide">Community guide</Link>
          {' · '}
          <Link to="/providers/guide">Provider guide</Link>
        </p>
      </article>
    </main>
  );
}
