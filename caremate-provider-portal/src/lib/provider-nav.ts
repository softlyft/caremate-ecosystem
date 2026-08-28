import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Megaphone,
  BarChart3,
  Building2,
  Settings,
  FlaskConical,
  Landmark,
} from 'lucide-react';
import type { CarePortalNavGroup } from '@/lib/care-portal-nav';

export const PROVIDER_NAV_GROUPS: CarePortalNavGroup[] = [
  {
    label: 'General',
    items: [
      {
        href: '/app/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        module: 'dashboard',
        match: 'exact',
      },
    ],
  },
  {
    label: 'Patients',
    items: [
      {
        href: '/app/patients',
        label: 'Connected Patients',
        icon: Users,
        module: 'patients',
        match: 'list',
      },
      {
        href: '/app/patients/requests',
        label: 'Connection Requests',
        icon: UserPlus,
        module: 'patients',
      },
    ],
  },
  {
    label: 'Payers',
    items: [
      {
        href: '/app/payers',
        label: 'Connected Payers',
        icon: Landmark,
        module: 'payers',
        match: 'list',
      },
      {
        href: '/app/payers/requests',
        label: 'Connection Requests',
        icon: UserPlus,
        module: 'payers',
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { href: '/app/documents', label: 'Documents', icon: FileText, module: 'documents' },
      { href: '/app/broadcasts', label: 'Messages', icon: Megaphone, module: 'messaging' },
      { href: '/app/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics' },
    ],
  },
  {
    label: 'Clinical',
    items: [{ href: '/app/lab', label: 'Laboratory', icon: FlaskConical, module: 'laboratory' }],
  },
  {
    label: 'Organization',
    items: [
      {
        href: '/app/organization',
        label: 'Organization',
        icon: Building2,
        module: 'organization',
      },
      { href: '/app/settings', label: 'Settings', icon: Settings, module: 'settings' },
    ],
  },
];
