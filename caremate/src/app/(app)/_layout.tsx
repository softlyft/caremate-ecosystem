import { Stack } from 'expo-router';
import {
  Crown,
  MapPinned,
  QrCode,
  Settings,
  ShieldPlus,
  UserRoundPen,
  Users,
} from 'lucide-react-native';

import {
  glossyStackHeaderOptions,
  learnArticleHeaderOptions,
} from '@/components/navigation/glossyStackHeader';
import { miniAppHeaderOptions } from '@/mini-apps/_kit/components/miniAppHeaderOptions';
import { palette } from '@/theme';

const premiumHeader = {
  accent: '#B45309',
  soft: '#FEF3C7',
  softEnd: '#FFFBEB',
  titleColor: '#92400E',
} as const;

const emergencyHeader = {
  accent: palette.brandPurple,
  soft: palette.purpleLight,
  softEnd: '#F5F3FF',
  titleColor: palette.brandPurpleDark,
} as const;

const familyHeader = {
  accent: palette.brandBlue,
  soft: palette.brandBlueLight,
  softEnd: '#EFF6FF',
  titleColor: palette.brandBlue,
} as const;

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ title: 'Apps' }} />
      <Stack.Screen name="search" options={{ headerShown: false, title: 'Search' }} />
      <Stack.Screen name="setup/emergency" options={{ headerShown: false }} />
      <Stack.Screen name="setup/family-prompt" options={{ headerShown: false }} />
      <Stack.Screen name="setup/done" options={{ headerShown: false }} />
      <Stack.Screen
        name="emergency/index"
        options={glossyStackHeaderOptions({
          title: 'Emergency',
          ...emergencyHeader,
          icon: ShieldPlus,
          backAccessibilityLabel: 'Back to Profile',
        })}
      />
      <Stack.Screen
        name="emergency/edit"
        options={glossyStackHeaderOptions({
          title: 'Edit profile',
          ...emergencyHeader,
          icon: UserRoundPen,
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="emergency/qr"
        options={glossyStackHeaderOptions({
          title: 'Emergency QR',
          ...emergencyHeader,
          icon: QrCode,
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen name="articles/[id]" options={learnArticleHeaderOptions('Article')} />
      <Stack.Screen
        name="articles/category/[slug]"
        options={learnArticleHeaderOptions('Category')}
      />
      <Stack.Screen name="articles/bookmarks" options={learnArticleHeaderOptions('Bookmarks')} />
      <Stack.Screen
        name="providers/[id]"
        options={glossyStackHeaderOptions({
          title: 'Provider',
          accent: palette.brandBlue,
          soft: palette.brandBlueLight,
          softEnd: '#EFF6FF',
          titleColor: palette.brandBlue,
          icon: MapPinned,
          backAccessibilityLabel: 'Back to Nearby',
        })}
      />
      <Stack.Screen
        name="providers/map"
        options={glossyStackHeaderOptions({
          title: 'Map',
          accent: palette.brandBlue,
          soft: palette.brandBlueLight,
          softEnd: '#EFF6FF',
          titleColor: palette.brandBlue,
          icon: MapPinned,
          backAccessibilityLabel: 'Back to Nearby',
        })}
      />
      <Stack.Screen
        name="profile/settings"
        options={glossyStackHeaderOptions({
          title: 'Settings',
          accent: '#475569',
          soft: '#F1F5F9',
          softEnd: '#F8FAFC',
          titleColor: '#334155',
          icon: Settings,
          backAccessibilityLabel: 'Back to Profile',
        })}
      />
      <Stack.Screen
        name="profile/premium"
        options={glossyStackHeaderOptions({
          title: 'Premium',
          ...premiumHeader,
          icon: Crown,
          backAccessibilityLabel: 'Back to Profile',
        })}
      />
      <Stack.Screen
        name="family/index"
        options={glossyStackHeaderOptions({
          title: 'Family',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back to Profile',
        })}
      />
      <Stack.Screen
        name="family/setup"
        options={glossyStackHeaderOptions({
          title: 'Family setup',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back',
        })}
      />
      <Stack.Screen
        name="family/kids-count"
        options={glossyStackHeaderOptions({
          title: 'Kids',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back',
        })}
      />
      <Stack.Screen
        name="family/child/[index]"
        options={glossyStackHeaderOptions({
          title: 'Child profile',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back',
        })}
      />
      <Stack.Screen
        name="family/review"
        options={glossyStackHeaderOptions({
          title: 'Review family',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back',
        })}
      />
      <Stack.Screen
        name="family/requests"
        options={glossyStackHeaderOptions({
          title: 'Requests',
          ...familyHeader,
          icon: Users,
          backAccessibilityLabel: 'Back',
        })}
      />

      <Stack.Screen
        name="apps/period-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: 'Period Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="apps/period-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: 'Log Period',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="apps/pregnancy-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Pregnancy Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="apps/pregnancy-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Set Up Pregnancy',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="apps/pregnancy-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Daily Log',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="apps/immunization-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Immunization Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="apps/immunization-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Family children',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="apps/immunization-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Log Vaccine',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="apps/medication-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: 'Medication Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="apps/medication-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: 'Add Medicine',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="apps/medication-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: 'Log Dose',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="apps/checkup-planner/index"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Checkup Planner',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="apps/checkup-planner/setup"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Set Up Planner',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="apps/checkup-planner/log"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Log Checkup',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
    </Stack>
  );
}
