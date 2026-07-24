function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

const siteUrl = trimTrailingSlash(
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || 'https://getcaremate.com',
);
const communityPortalUrl = trimTrailingSlash(
  (import.meta.env.VITE_COMMUNITY_PORTAL_URL as string | undefined)?.trim() ||
    'https://community.getcaremate.com',
);

export const SITE_URL = siteUrl;

export const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/app/caremate',
  android: 'https://play.google.com/store/apps/details?id=com.softlyft.caremate',
} as const;

/** CareMate Community Network — marketing page on the website; join on the community portal. */
export const COMMUNITY_URLS = {
  join: `${communityPortalUrl}/join`,
  /** Hostname for display copy (no scheme). */
  joinHost: new URL(communityPortalUrl).host,
  marketingHost: new URL(siteUrl).host,
} as const;

export const BRAND = {
  name: 'CareMate',
  tagline: 'Your health journey, organized.',
} as const;

export const COMMUNITY_GROUPS = [
  {
    id: 'champions',
    title: 'Community Champions',
    description:
      'Grow CareMate in campuses, neighbourhoods, and workplaces — introduce families, host awareness events, and gather feedback.',
    accent: '#0D9488',
    soft: '#CCFBF1',
  },
  {
    id: 'health',
    title: 'Health Contributors',
    description:
      'Strengthen trusted health education — review content, write guides, translate resources, and keep patient information accurate.',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
  {
    id: 'builders',
    title: 'Builder Network',
    description:
      'Shape the product — improve features, fix bugs, design interfaces, write docs, and support research.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'partners',
    title: 'Partner Champions',
    description:
      'Help hospitals, clinics, pharmacies, labs, and NGOs adopt CareMate and connect with the patients they already serve.',
    accent: '#7C3AED',
    soft: '#F3E8FF',
  },
] as const;

export const COMMUNITY_JOIN_STEPS = [
  {
    title: 'Verify your CareMate account',
    description: 'Enter your CareMate Patient ID and confirm the code sent to your registered email.',
  },
  {
    title: 'Choose a chapter',
    description: 'Join an active campus, city, or community chapter created for your area.',
  },
  {
    title: 'Start contributing',
    description:
      'Introduce families, support events, improve health content, build features, or champion providers — at a pace that works for you.',
  },
] as const;

export const CORE_FEATURES = [
  {
    id: 'emergency',
    title: 'Emergency profile',
    description:
      'Blood group, genotype, allergies, medications, and ICE contacts — available offline and shareable when it counts.',
    accent: '#0D9488',
    soft: '#CCFBF1',
  },
  {
    id: 'learn',
    title: 'Learn',
    description:
      'Trusted health articles by category, with bookmarks and reading progress that stay on your device.',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
  {
    id: 'nearby',
    title: 'Nearby care',
    description:
      'Find hospitals, pharmacies, labs, and clinics around you — browse details and save favorites.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'messages',
    title: 'Messages',
    description:
      'Hear from connected clinics in your inbox, reply in-thread, and message practitioners at organizations you share.',
    accent: '#0F766E',
    soft: '#CCFBF1',
  },
  {
    id: 'family',
    title: 'Family & profile',
    description:
      'Household kids, spouse connection, Patient ID, and preferences that sync when you are signed in.',
    accent: '#7C3AED',
    soft: '#F3E8FF',
  },
] as const;

export const MINI_APPS = [
  {
    id: 'vitals',
    name: 'Vitals',
    description: 'Log blood pressure, sugar, heart rate, temperature, weight, and more — your health balance at a glance.',
    accent: '#1D4ED8',
    soft: '#DBEAFE',
  },
  {
    id: 'medication',
    name: 'Medication Assistant',
    description: 'Schedule doses, confirm what you took, track refills, and get in-app due and missed reminders.',
    accent: '#EA580C',
    soft: '#FFEDD5',
  },
  {
    id: 'checkup',
    name: 'Checkup Planner',
    description: 'Age-, gender-, and region-aware checkup checklists for this year and next.',
    accent: '#0F766E',
    soft: '#CCFBF1',
  },
  {
    id: 'immunization',
    name: 'Immunization Tracker',
    description: 'Childhood vaccine schedules, due dates, and dose logs tied to kids in your family profile.',
    accent: '#059669',
    soft: '#D1FAE5',
  },
  {
    id: 'pregnancy',
    name: 'Pregnancy Tracker',
    description: 'Follow pregnancy week by week, log symptoms and mood, and keep milestones in one place.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'period',
    name: 'Period Tracker',
    description: 'Mark period days, see cycle length, and get simple predictions for what comes next.',
    accent: '#DB2777',
    soft: '#FCE7F3',
  },
] as const;

/** CareMate Provider Portal — engagement channel for healthcare organizations. */
export const PROVIDER_CAPABILITIES = [
  {
    id: 'connections',
    title: 'Patient connections',
    description:
      'Request a link with a CareMate Patient ID, or approve patients who want to connect. One trusted contact record — no clinical data is shared until you choose to.',
    accent: '#0D9488',
    soft: '#CCFBF1',
  },
  {
    id: 'documents',
    title: 'Secure documents',
    description:
      'Share prescriptions, lab results, imaging reports, referrals, and invoices with a connected patient through CareMate.',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
  {
    id: 'messages',
    title: 'Messages',
    description:
      'Message connected patients — all or selected — and continue the conversation in two-way threads. Patients get a push when you send.',
    accent: '#0284C7',
    soft: '#E0F2FE',
  },
  {
    id: 'appointments',
    title: 'Appointment requests',
    description:
      'Receive and respond to appointment requests from patients. Calendars stay in your own systems.',
    accent: '#7C3AED',
    soft: '#F3E8FF',
  },
] as const;

export const PROVIDER_ORG_TYPES = [
  'Hospital',
  'Clinic',
  'Pharmacy',
  'Laboratory',
  'Imaging Centre',
  'Blood Bank',
  'Ambulance Service',
  'Insurance / HMO',
] as const;
