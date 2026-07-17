import { Stack } from 'expo-router';
import {
  Bell,
  Crown,
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

        {/* Nested navigator owns mini-app headers — see apps/_layout.tsx */}
        <Stack.Screen name="apps" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
