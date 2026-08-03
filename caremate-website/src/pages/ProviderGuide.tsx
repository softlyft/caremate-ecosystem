import { Link } from 'react-router-dom';

import { BRAND, PROVIDER_CAPABILITIES, PROVIDER_ORG_TYPES } from '@/lib/brand';
import styles from './Guide.module.css';

export function ProviderGuidePage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.eyebrow}>Provider guide</p>
        <h1>How to use the {BRAND.name} Provider Portal</h1>
        <p className={styles.lead}>
          A plain-language walkthrough for hospitals, clinics, pharmacies, labs, and other care
          organizations — how to claim your listing, connect with CareMate patients, and use
          engagement tools without replacing your clinical systems.
        </p>

        <nav className={styles.toc} aria-label="Guide contents">
          <p className={styles.tocTitle}>On this page</p>
          <a href="#what">What this portal is</a>
          <a href="#claim">Claim your organization</a>
          <a href="#roles">Roles on your team</a>
          <a href="#connect">Patient connections</a>
          <a href="#features">Documents, messages, appointments</a>
          <a href="#staff">Mark connected patients as staff</a>
          <a href="#patients">What patients see</a>
          <a href="#safety">Important to know</a>
        </nav>

        <h2 id="what">What this portal is</h2>
        <p>
          The CareMate Provider Portal is a <strong>patient engagement</strong> channel. It is not
          an HMS, LIMS, pharmacy system, or EHR. You keep your clinical and operations software.
          CareMate gives you a trusted way to link with patients who already use the CareMate mobile
          app.
        </p>
        <p>In scope today:</p>
        <ul className={styles.list}>
          {PROVIDER_CAPABILITIES.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> — {item.description}
            </li>
          ))}
        </ul>
        <p>
          Portal organization types include:{' '}
          {PROVIDER_ORG_TYPES.slice(0, -1).join(', ')}, and {PROVIDER_ORG_TYPES.at(-1)}.
        </p>

        <h2 id="claim">Claim your organization</h2>
        <p>
          There is no open registration. Your organization must already appear (or be added) in the
          CareMate provider catalog.
        </p>
        <ol className={styles.steps}>
          <li>
            Open the Provider Portal claim page and enter the contact email SoftLyft already has on
            your catalog listing (location email, or the organization contact).
          </li>
          <li>
            Confirm the verification code (shown in the product today while email delivery is still
            being rolled out).
          </li>
          <li>
            Set an admin password. CareMate creates your owner account, membership, and organization
            profile.
          </li>
          <li>
            Completing claim marks your organization as <strong>verified</strong>. Verified
            organizations can receive Connect requests from patients in the CareMate app.
          </li>
        </ol>
        <p className={styles.note}>
          Returning staff sign in with email and password. SoftLyft can also seed a membership for
          emergency access when needed.
        </p>

        <h2 id="roles">Roles on your team</h2>
        <ul className={styles.list}>
          <li>
            <strong>Owner</strong> — full organization control and membership.
          </li>
          <li>
            <strong>Administrator</strong> — manage profile, patients, and content.
          </li>
          <li>
            <strong>Staff</strong> — day-to-day connections, documents, messages, and appointments.
          </li>
          <li>
            <strong>Viewer</strong> — read-only.
          </li>
        </ul>

        <h2 id="connect">Patient connections</h2>
        <p>
          A connection is a CRM-style contact record between your organization and a CareMate
          patient. Approving only establishes that link — it does not open the patient’s clinical
          chart.
        </p>
        <h3>Provider → patient</h3>
        <ol className={styles.steps}>
          <li>
            Ask the patient for their 12-digit CareMate Patient ID (shown on Me in the CareMate
            app).
          </li>
          <li>
            In the portal, open Connection requests and send a request with that ID (optional note
            allowed).
          </li>
          <li>
            The patient reviews the request under Me → Connections → Provider connection requests
            and approves or declines.
          </li>
        </ol>
        <h3>Patient → provider</h3>
        <ol className={styles.steps}>
          <li>
            A signed-in patient opens your listing in Nearby and taps Connect with provider
            (verified organizations only).
          </li>
          <li>
            Your staff see the request under Connection requests → Awaiting your review, then
            approve or reject.
          </li>
        </ol>
        <h3>Rules that keep things simple</h3>
        <ul className={styles.list}>
          <li>Each patient and organization may have only one connection record.</li>
          <li>
            If either side rejects, a <strong>rejection reason</strong> is required. You cannot send
            another request for the same pair afterward.
          </li>
          <li>
            Patients will not see a Connect button for organizations that have not completed claim /
            verification.
          </li>
        </ul>

        <h2 id="features">Documents, messages, appointments</h2>
        <ul className={styles.list}>
          <li>
            <strong>Documents</strong> — upload files for a connected patient (for example
            prescriptions, lab results, imaging reports, referrals, discharge summaries, invoices).
            Patients open them in the CareMate app under Me → Documents.
          </li>
          <li>
            <strong>Messages</strong> — send to all connected patients or a selected list. Each
            patient gets a conversation thread; they can reply in the CareMate app, and your team can
            continue the thread in the portal. Sending triggers a push notification when the patient
            has a registered device.
          </li>
          <li>
            <strong>Appointment requests</strong> — review patient-initiated requests and update
            status. CareMate does not sync your external calendar in this release.
          </li>
        </ul>

        <h2 id="staff">Mark connected patients as staff</h2>
        <p>
          CareMate users who work at your organization can connect as patients first, then be
          elevated to portal staff.
        </p>
        <ol className={styles.steps}>
          <li>
            The person signs into the CareMate app, edits their profile, and can declare they are a
            health practitioner.
          </li>
          <li>They connect with your organization (Nearby → Connect, or you request by Patient ID).</li>
          <li>
            An owner or administrator opens the connected patient in Patients, then chooses{' '}
            <strong>Mark as staff</strong>. Optional workplace fields: position, company email, and
            company phone.
          </li>
          <li>
            Once marked as staff, they can use the CareMate app to message other practitioners or
            patients at the same organization (direct chat). Two patients who are not staff cannot
            message each other.
          </li>
        </ol>

        <h2 id="patients">What patients see</h2>
        <ul className={styles.list}>
          <li>They find you in Nearby like any catalog listing.</li>
          <li>
            After you claim, they can request a connection from provider detail if your organization
            is verified.
          </li>
          <li>
            They manage Connected providers and inbound requests under Me → Connections in the
            CareMate app.
          </li>
          <li>
            Shared documents from connected providers appear under Me → Documents in the CareMate
            app.
          </li>
          <li>
            Clinic messages and replies live under <strong>Messages</strong> on Home in the CareMate
            app (separate from the notifications bell).
          </li>
          <li>
            The patient app guide covers how patients use CareMate day to day — see{' '}
            <Link to="/docs/patient">Patient guide</Link>.
          </li>
        </ul>

        <h2 id="safety">Important to know</h2>
        <p className={styles.callout}>
          <strong>CareMate Provider Portal does not replace clinical systems.</strong> Do not use it
          as your medical record, billing system, or emergency communications channel. Follow your
          organization&apos;s privacy, consent, and clinical policies when messaging or sharing
          documents with patients.
        </p>
        <ul className={styles.list}>
          <li>
            Connection alone is not consent to share every document type — share only what is
            appropriate for each patient relationship.
          </li>
          <li>
            Patients remain responsible for their CareMate emergency profiles and personal trackers;
            those are patient-managed tools.
          </li>
          <li>
            For portal access or catalog changes, contact SoftLyft — the team that operates CareMate.
          </li>
        </ul>

        <p className={styles.meta}>Last updated: July 19, 2026</p>
        <p className={styles.back}>
          <Link to="/docs">← All docs</Link>
          {' · '}
          <Link to="/providers">Providers</Link>
          {' · '}
          <Link to="/docs/community">Community guide</Link>
          {' · '}
          <Link to="/">CareMate home</Link>
        </p>
      </article>
    </main>
  );
}
