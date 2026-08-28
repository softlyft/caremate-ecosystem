import {
  LayoutDashboard,
  Building2,
  Settings,
  Hospital,
  UserPlus,
  Users,
  FileText,
  Megaphone,
} from 'lucide-react';
import type { CarePortalNavGroup } from '@/lib/care-portal-nav';

export const PAYER_NAV_GROUPS: CarePortalNavGroup[] = [
  {
    label: 'General',
    items: [
      { href: '/payer/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
    ],
  },
  {
    label: 'Providers',
    items: [
      {
        href: '/payer/providers',
        label: 'Connected Providers',
        icon: Hospital,
        match: 'list',
      },
      {
        href: '/payer/providers/requests',
        label: 'Connection Requests',
        icon: UserPlus,
      },
    ],
  },
  {
    label: 'Patients',
    items: [
      { href: '/payer/patients', label: 'Connected Patients', icon: Users, match: 'list' },
      { href: '/payer/patients/requests', label: 'Connection Requests', icon: UserPlus },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { href: '/payer/documents', label: 'Documents', icon: FileText, match: 'exact' },
      { href: '/payer/broadcasts', label: 'Messages', icon: Megaphone },
    ],
  },
  {
    label: 'Organization',
    items: [
      { href: '/payer/organization', label: 'Organization', icon: Building2 },
      { href: '/payer/settings', label: 'Settings', icon: Settings },
    ],
  },
];
