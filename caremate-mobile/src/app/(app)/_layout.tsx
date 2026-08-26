import { Redirect, Stack, router } from 'expo-router';
import {
  Bell,
  CalendarClock,
  Crown,
  FileText,
  Heart,
  Link2,
  MapPinned,
  MessageCircle,
  QrCode,
  Settings,
  Shield,
  ShieldPlus,
  UserRoundPen,
  Users,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import {
  glossyStackHeaderOptions,
  learnArticleHeaderOptions,
} from '@/components/navigation/glossyStackHeader';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { takePendingArticleShareId } from '@/domains/articles/share';
import { takePendingEmergencyShareToken } from '@/domains/emergency/share';
import { useAuthStore } from '@/features/auth/store';
import { useIsGuest } from '@/hooks/use-current-user-id';
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useIsGuest();
  const resumedShare = useRef(false);

  useEffect(() => {
    if (resumedShare.current || passwordRecoveryPending) {
      return;
    }
    resumedShare.current = true;
    void (async () => {
      const articleId = await takePendingArticleShareId();
      if (articleId) {
        router.push(`/(app)/articles/${articleId}`);
      }
      if (!isAuthenticated || isGuest) {
        return;
      }
      const token = await takePendingEmergencyShareToken();
      if (token) {
        router.push(`/emergency/share/${token}`);
      }
    })();
  }, [isAuthenticated, isGuest, passwordRecoveryPending]);

  if (passwordRecoveryPending) {
    return <Redirect href="/auth/reset-password" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: 'Apps' }} />
        <Stack.Screen name="search" options={{ headerShown: false, title: 'Search' }} />
        <Stack.Screen
          name="timeline"
          options={glossyStackHeaderOptions({
            title: 'Health timeline',
            accent: '#4338CA',
            soft: '#EEF2FF',
            softEnd: '#F5F3FF',
            titleColor: '#4338CA',
            icon: CalendarClock,
            backAccessibilityLabel: 'Back to Home',
            backFallbackHref: '/(app)/(tabs)',
          })}
        />
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
        <Stack.Screen
          name="messages/index"
          options={glossyStackHeaderOptions({
            title: 'Messages',
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: 'Back to Home',
          })}
        />
        <Stack.Screen
          name="messages/new"
          options={glossyStackHeaderOptions({
            title: 'New message',
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: 'Back to Messages',
          })}
        />
        <Stack.Screen
          name="messages/[id]"
          options={glossyStackHeaderOptions({
            title: 'Conversation',
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: 'Back to Messages',
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
            backFallbackHref: '/(app)/(tabs)/providers',
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
            backFallbackHref: '/(app)/(tabs)/providers',
          })}
        />
        <Stack.Screen
          name="providers/favorites"
          options={glossyStackHeaderOptions({
            title: 'Favorites',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Heart,
            backAccessibilityLabel: 'Back to Nearby',
            backFallbackHref: '/(app)/(tabs)/providers',
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
            backFallbackHref: '/(app)/(tabs)/profile',
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
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/[connectionId]"
          options={glossyStackHeaderOptions({
            title: 'Provider',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: 'Back to connected providers',
            backFallbackHref: '/(app)/providers/connections/connected',
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
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/outbound"
          options={glossyStackHeaderOptions({
            title: 'Sent requests',
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: 'Back to Connections',
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="profile/edit"
          options={glossyStackHeaderOptions({
            title: 'Edit profile',
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: UserRoundPen,
            backAccessibilityLabel: 'Back to Me',
            backFallbackHref: '/(app)/(tabs)/profile',
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
          name="profile/insurance/index"
          options={glossyStackHeaderOptions({
            title: 'Health Insurance',
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4F46E5',
            icon: Shield,
            backAccessibilityLabel: 'Back to Me',
          })}
        />
        <Stack.Screen
          name="profile/insurance/[id]"
          options={glossyStackHeaderOptions({
            title: 'Insurance',
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4F46E5',
            icon: Shield,
            backAccessibilityLabel: 'Back to directory',
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
          name="family/child/edit/[id]"
          options={glossyStackHeaderOptions({
            title: 'Edit child',
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: 'Back to Family',
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
      {/* Overlay after Stack so it paints on top without shifting layout */}
      <SyncStatusBanner />
    </View>
  );
}
