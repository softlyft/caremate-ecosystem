import { Redirect, Stack } from 'expo-router';
import {
  Bell,
  Crown,
  FileText,
  Link2,
  MapPinned,
  QrCode,
  Settings,
  ShieldPlus,
  UserRoundPen,
  Users,
} from 'lucide-react-native';
import { View } from 'react-native';

import {
  glossyStackHeaderOptions,
  learnArticleHeaderOptions,
} from '@/components/navigation/glossyStackHeader';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { useAuthStore } from '@/features/auth/store';
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
  const passwordRecoveryPending = useAuthStore((state) => state.passwordRecoveryPending);
  if (passwordRecoveryPending) {
    return <Redirect href="/auth/reset-password" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <SyncStatusBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: 'Apps' }} />
        <Stack.Screen name="search" options={{ headerShown: false, title: 'Search' }} />
        <Stack.Screen
          name="notifications/index"
          options={glossyStackHeaderOptions({
            title: 'Notifications',
            accent: '#4F46E5',
            soft: '#EEF2FF',
            softEnd: '#F5F3FF',
            titleColor: '#4338CA',
            icon: Bell,
            backAccessibilityLabel: 'Back to Home',
          })}
        />
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
        <Stack.Screen name="articles/reading" options={learnArticleHeaderOptions('Reading')} />
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
          name="providers/connections/index"
          options={glossyStackHeaderOptions({
            title: 'Connections',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: 'Back to Me',
          })}
        />
        <Stack.Screen
          name="providers/connections/connected"
          options={glossyStackHeaderOptions({
            title: 'Connected providers',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: 'Back to Connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/requests"
          options={glossyStackHeaderOptions({
            title: 'Connection requests',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: 'Back to Connections',
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
          name="profile/documents"
          options={glossyStackHeaderOptions({
            title: 'Documents',
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: FileText,
            backAccessibilityLabel: 'Back to Me',
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

        {/* Nested navigator owns mini-app headers — see apps/_layout.tsx */}
        <Stack.Screen name="apps" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
