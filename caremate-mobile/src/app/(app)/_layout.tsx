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
import { takePendingArticleShareId } from '@/domains/articles/share';
import { takePendingEmergencyShareToken } from '@/domains/emergency/share';
import { useTranslation } from '@/domains/localization';
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
  const { t } = useTranslation();
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
        <Stack.Screen name="(tabs)" options={{ title: t('nav.tabs') }} />
        <Stack.Screen name="search" options={{ headerShown: false, title: t('nav.search') }} />
        <Stack.Screen
          name="timeline"
          options={glossyStackHeaderOptions({
            title: t('nav.timeline'),
            accent: '#4338CA',
            soft: '#EEF2FF',
            softEnd: '#F5F3FF',
            titleColor: '#4338CA',
            icon: CalendarClock,
            backAccessibilityLabel: t('nav.backToHome'),
            backFallbackHref: '/(app)/(tabs)',
          })}
        />
        <Stack.Screen
          name="notifications/index"
          options={glossyStackHeaderOptions({
            title: t('nav.notifications'),
            accent: '#4F46E5',
            soft: '#EEF2FF',
            softEnd: '#F5F3FF',
            titleColor: '#4338CA',
            icon: Bell,
            backAccessibilityLabel: t('nav.backToHome'),
          })}
        />
        <Stack.Screen
          name="messages/index"
          options={glossyStackHeaderOptions({
            title: t('nav.messages'),
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: t('nav.backToHome'),
          })}
        />
        <Stack.Screen
          name="messages/new"
          options={glossyStackHeaderOptions({
            title: t('nav.newMessage'),
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: t('nav.backToMessages'),
          })}
        />
        <Stack.Screen
          name="messages/[id]"
          options={glossyStackHeaderOptions({
            title: t('nav.conversation'),
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: MessageCircle,
            backAccessibilityLabel: t('nav.backToMessages'),
          })}
        />
        <Stack.Screen name="setup/emergency" options={{ headerShown: false }} />
        <Stack.Screen name="setup/family-prompt" options={{ headerShown: false }} />
        <Stack.Screen name="setup/done" options={{ headerShown: false }} />
        <Stack.Screen
          name="emergency/index"
          options={glossyStackHeaderOptions({
            title: t('nav.emergency'),
            ...emergencyHeader,
            icon: ShieldPlus,
            backAccessibilityLabel: t('nav.backToProfile'),
          })}
        />
        <Stack.Screen
          name="emergency/edit"
          options={glossyStackHeaderOptions({
            title: t('nav.editProfile'),
            ...emergencyHeader,
            icon: UserRoundPen,
            modal: true,
            backAccessibilityLabel: t('nav.close'),
          })}
        />
        <Stack.Screen
          name="emergency/qr"
          options={glossyStackHeaderOptions({
            title: t('nav.emergencyQr'),
            ...emergencyHeader,
            icon: QrCode,
            modal: true,
            backAccessibilityLabel: t('nav.close'),
          })}
        />
        <Stack.Screen name="articles/[id]" options={learnArticleHeaderOptions(t('nav.article'))} />
        <Stack.Screen
          name="articles/category/[slug]"
          options={learnArticleHeaderOptions(t('nav.category'))}
        />
        <Stack.Screen
          name="articles/bookmarks"
          options={learnArticleHeaderOptions(t('nav.bookmarks'))}
        />
        <Stack.Screen
          name="articles/reading"
          options={learnArticleHeaderOptions(t('nav.reading'))}
        />
        <Stack.Screen
          name="providers/[id]"
          options={glossyStackHeaderOptions({
            title: t('nav.provider'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: MapPinned,
            backAccessibilityLabel: t('nav.backToNearby'),
            backFallbackHref: '/(app)/(tabs)/providers',
          })}
        />
        <Stack.Screen
          name="providers/map"
          options={glossyStackHeaderOptions({
            title: t('nav.map'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: MapPinned,
            backAccessibilityLabel: t('nav.backToNearby'),
            backFallbackHref: '/(app)/(tabs)/providers',
          })}
        />
        <Stack.Screen
          name="providers/favorites"
          options={glossyStackHeaderOptions({
            title: t('nav.favorites'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Heart,
            backAccessibilityLabel: t('nav.backToNearby'),
            backFallbackHref: '/(app)/(tabs)/providers',
          })}
        />
        <Stack.Screen
          name="providers/connections/index"
          options={glossyStackHeaderOptions({
            title: t('nav.connections'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: t('nav.backToMe'),
            backFallbackHref: '/(app)/(tabs)/profile',
          })}
        />
        <Stack.Screen
          name="providers/connections/connected"
          options={glossyStackHeaderOptions({
            title: t('nav.connectedProviders'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/[connectionId]"
          options={glossyStackHeaderOptions({
            title: t('nav.provider'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: t('nav.backToConnectedProviders'),
            backFallbackHref: '/(app)/providers/connections/connected',
          })}
        />
        <Stack.Screen
          name="providers/connections/requests"
          options={glossyStackHeaderOptions({
            title: t('nav.connectionRequests'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/outbound"
          options={glossyStackHeaderOptions({
            title: t('nav.sentRequests'),
            accent: palette.brandBlue,
            soft: palette.brandBlueLight,
            softEnd: '#EFF6FF',
            titleColor: palette.brandBlue,
            icon: Link2,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/payers/connected"
          options={glossyStackHeaderOptions({
            title: t('nav.connectedPayers'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4338CA',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/payers/[connectionId]"
          options={glossyStackHeaderOptions({
            title: t('nav.connectedInsurer'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4338CA',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToConnectedPayers'),
            backFallbackHref: '/(app)/providers/connections/payers/connected',
          })}
        />
        <Stack.Screen
          name="providers/connections/payers/requests"
          options={glossyStackHeaderOptions({
            title: t('nav.payerConnectionRequests'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4338CA',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="providers/connections/payers/outbound"
          options={glossyStackHeaderOptions({
            title: t('nav.payerSentRequests'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4338CA',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToConnections'),
            backFallbackHref: '/(app)/providers/connections',
          })}
        />
        <Stack.Screen
          name="profile/edit"
          options={glossyStackHeaderOptions({
            title: t('nav.editProfile'),
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: UserRoundPen,
            backAccessibilityLabel: t('nav.backToMe'),
            backFallbackHref: '/(app)/(tabs)/profile',
          })}
        />
        <Stack.Screen
          name="profile/settings"
          options={glossyStackHeaderOptions({
            title: t('nav.settings'),
            accent: '#475569',
            soft: '#F1F5F9',
            softEnd: '#F8FAFC',
            titleColor: '#334155',
            icon: Settings,
            backAccessibilityLabel: t('nav.backToProfile'),
          })}
        />
        <Stack.Screen
          name="profile/documents"
          options={glossyStackHeaderOptions({
            title: t('nav.documents'),
            accent: palette.primary,
            soft: palette.primaryLight,
            softEnd: '#F0FDFA',
            titleColor: palette.primaryDark,
            icon: FileText,
            backAccessibilityLabel: t('nav.backToMe'),
          })}
        />
        <Stack.Screen
          name="profile/insurance/index"
          options={glossyStackHeaderOptions({
            title: t('nav.healthInsurance'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4F46E5',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToMe'),
          })}
        />
        <Stack.Screen
          name="profile/insurance/[id]"
          options={glossyStackHeaderOptions({
            title: t('nav.insurance'),
            accent: '#4F46E5',
            soft: '#E0E7FF',
            softEnd: '#EEF2FF',
            titleColor: '#4F46E5',
            icon: Shield,
            backAccessibilityLabel: t('nav.backToDirectory'),
          })}
        />
        <Stack.Screen
          name="profile/premium"
          options={glossyStackHeaderOptions({
            title: t('nav.premium'),
            ...premiumHeader,
            icon: Crown,
            backAccessibilityLabel: t('nav.backToProfile'),
          })}
        />
        <Stack.Screen
          name="family/index"
          options={glossyStackHeaderOptions({
            title: t('nav.family'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.backToProfile'),
          })}
        />
        <Stack.Screen
          name="family/setup"
          options={glossyStackHeaderOptions({
            title: t('nav.familySetup'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.back'),
          })}
        />
        <Stack.Screen
          name="family/kids-count"
          options={glossyStackHeaderOptions({
            title: t('nav.kids'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.back'),
          })}
        />
        <Stack.Screen
          name="family/child/[index]"
          options={glossyStackHeaderOptions({
            title: t('nav.childProfile'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.back'),
          })}
        />
        <Stack.Screen
          name="family/child/edit/[id]"
          options={glossyStackHeaderOptions({
            title: t('nav.editChild'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.backToProfile'),
          })}
        />
        <Stack.Screen
          name="family/review"
          options={glossyStackHeaderOptions({
            title: t('nav.reviewFamily'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.back'),
          })}
        />
        <Stack.Screen
          name="family/requests"
          options={glossyStackHeaderOptions({
            title: t('nav.requests'),
            ...familyHeader,
            icon: Users,
            backAccessibilityLabel: t('nav.back'),
          })}
        />

        {/* Nested navigator owns mini-app headers — see apps/_layout.tsx */}
        <Stack.Screen name="apps" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
