import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, FileText, MapPin, Settings, Shield, Trash2, Users } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { Button } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { Switch } from '@/components/ui/switch';
import { LEGAL_URLS, QUERY_KEYS } from '@/constants/config';
import { localizationService, useTranslation } from '@/domains/localization';
import { setDeviceDefaults } from '@/domains/onboarding';
import { clearPushRegistration, syncPushRegistration } from '@/domains/notifications/push';
import { profileRepository } from '@/domains/profile/repository';
import { useSettingsStore } from '@/domains/profile/store';
import { useAuthStore } from '@/features/auth/store';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = '#475569';
const SOFT = '#F1F5F9';
const SOFT_END = '#F8FAFC';
const TITLE = '#334155';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const deleteAccount = useAuthStore((state) => state.deleteAccount);

  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const remoteCountryCode = profileQuery.data?.countryCode ?? null;
  const remoteLanguageCode = profileQuery.data?.languageCode ?? null;
  const remoteState = profileQuery.data?.state ?? '';
  const [countryDraft, setCountryDraft] = useState<string | null | undefined>(undefined);
  const [languageDraft, setLanguageDraft] = useState<string | null | undefined>(undefined);
  const [stateDraft, setStateDraft] = useState<string | undefined>(undefined);
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const countryCode = countryDraft !== undefined ? countryDraft : remoteCountryCode;
  const languageCode = languageDraft !== undefined ? languageDraft : remoteLanguageCode;
  const state = stateDraft !== undefined ? stateDraft : remoteState;
  const languages = localizationService.getSupportedLanguages(countryCode);
  const resolvedLanguage = localizationService.normalizeLanguage(countryCode, languageCode);

  async function updateNotifications(value: boolean) {
    setNotificationsEnabled(value);
    await Promise.all([
      profileRepository.saveSettings(userId, { notificationsEnabled: value }),
      setDeviceDefaults({ notificationsEnabled: value }),
    ]);
    if (value) {
      void syncPushRegistration({ requestPermission: true });
    } else {
      void clearPushRegistration();
    }
  }

  async function saveLocation() {
    if (isGuest) {
      return;
    }

    setSavingLocation(true);
    try {
      await profileRepository.save(userId, {
        countryCode,
        languageCode: resolvedLanguage,
        state: state.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
      setCountryDraft(undefined);
      setLanguageDraft(undefined);
      setStateDraft(undefined);
    } finally {
      setSavingLocation(false);
    }
  }

  async function openLegalUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('settings.legal.openFailed'));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.legal.openFailed'));
    }
  }

  function confirmDeleteAccount() {
    if (isGuest || deletingAccount) {
      return;
    }
    Alert.alert(
      t('settings.account.deleteConfirmTitle'),
      t('settings.account.deleteConfirmMessage'),
      [
        { text: t('settings.account.cancel'), style: 'cancel' },
        {
          text: t('settings.account.deleteConfirmAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingAccount(true);
              try {
                await deleteAccount();
                Alert.alert(
                  t('settings.account.deleteSuccessTitle'),
                  t('settings.account.deleteSuccessMessage'),
                  [{ text: 'OK', onPress: () => router.replace('/(app)/(tabs)/profile') }],
                );
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : t('settings.account.deleteFailed');
                Alert.alert(t('settings.account.deleteFailed'), message);
              } finally {
                setDeletingAccount(false);
              }
            })();
          },
        },
      ],
    );
  }

  if (!isGuest && profileQuery.isLoading) {
    return <LoadingState title={t('settings.loading')} />;
  }

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedSection index={0}>
          <View style={[styles.heroShell, shadow.card]}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: SOFT },
                { offset: '55%', color: SOFT },
                { offset: '100%', color: SOFT_END },
              ]}
              angle={130}
              style={styles.hero}
            >
              <View style={styles.heroBlob} />
              <View style={[styles.heroBlobSm, { backgroundColor: ACCENT }]} />

              <View style={styles.heroIconRing}>
                <View style={styles.heroIconInner}>
                  <Settings color={ACCENT} size={28} strokeWidth={2.2} />
                </View>
              </View>

              <AppText variant="caption" style={styles.heroEyebrow}>
                {t('settings.hero.eyebrow')}
              </AppText>
              <AppText variant="screenTitle" style={styles.heroTitle}>
                {t('settings.hero.title')}
              </AppText>
              <AppText variant="subtitle" style={styles.heroSubtitle}>
                {t('settings.hero.subtitle')}
              </AppText>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={[styles.card, shadow.soft]}>
            <SectionLabel icon={Users} title={t('settings.family.title')} />
            {isGuest ? (
              <AppText variant="caption" style={styles.muted}>
                {t('settings.familySection.guest')}
              </AppText>
            ) : (
              <>
                <AppText variant="caption" style={styles.muted}>
                  {t('settings.familySection.hint')}
                </AppText>
                <Button
                  style={styles.secondaryCta}
                  onPress={() => router.push('/(app)/family')}
                  variant="plain"
                >
                  <Users color={ACCENT} size={16} strokeWidth={2.25} />
                  <AppText variant="button" style={styles.secondaryCtaLabel}>
                    {t('settings.familySection.open')}
                  </AppText>
                </Button>
              </>
            )}
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <SectionLabel icon={Bell} title={t('settings.notifications.title')} />
            <SettingRow
              icon={Bell}
              label={t('settings.notifications.push')}
              trailing={<Switch value={notificationsEnabled} onValueChange={updateNotifications} />}
            />
          </View>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <View style={[styles.card, shadow.soft]}>
            <SectionLabel icon={MapPin} title={t('settings.location.title')} />
            {isGuest ? (
              <AppText variant="caption" style={styles.muted}>
                {t('settings.location.guestHint')}
              </AppText>
            ) : (
              <>
                <AppText variant="caption" style={styles.muted}>
                  {t('settings.location.hint')}
                </AppText>

                <AppText variant="caption" style={styles.fieldLabel}>
                  {t('settings.location.country')}
                </AppText>
                <CountrySelect
                  value={countryCode}
                  accent={ACCENT}
                  soft={SOFT}
                  placeholder={t('settings.location.selectPlaceholder')}
                  searchPlaceholder={t('settings.location.searchPlaceholder')}
                  searchEmptyLabel={t('settings.location.searchEmpty')}
                  sheetTitle={t('settings.location.country')}
                  closeAccessibilityLabel={t('common.close')}
                  onChange={(code) => {
                    if (!code) {
                      return;
                    }
                    setCountryDraft(code);
                    setLanguageDraft(localizationService.getDefaultLanguage(code));
                    // State stays in schema but is not edited in UI yet.
                    setStateDraft('');
                  }}
                />

                {countryCode ? (
                  <>
                    <AppText variant="caption" style={styles.fieldLabel}>
                      {t('settings.location.language')}
                    </AppText>
                    <View style={styles.chipRow}>
                      {languages.map((item) => {
                        const selected = resolvedLanguage === item;
                        return (
                          <Button
                            key={item}
                            style={[styles.chip, selected && styles.chipSelected]}
                            scale={0.96}
                            onPress={() => setLanguageDraft(item)}
                            variant="plain"
                          >
                            <AppText
                              variant="caption"
                              style={selected ? styles.chipTextSelected : styles.chipText}
                            >
                              {localizationService.getLanguageConfig(item).nativeName}
                            </AppText>
                          </Button>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {countryCode ? (
                  <AppText variant="caption" style={styles.muted}>
                    {t('settings.location.selected', {
                      value:
                        localizationService.getCountryName(countryCode) ||
                        t('settings.location.notSet'),
                    })}
                  </AppText>
                ) : null}
                <Button
                  style={[
                    styles.primaryCta,
                    savingLocation ? styles.ctaDisabled : null,
                    shadow.soft,
                  ]}
                  disabled={savingLocation}
                  onPress={() => void saveLocation()}
                  variant="plain"
                >
                  <MapPin color="#FFFFFF" size={16} strokeWidth={2.25} />
                  <AppText variant="button" style={styles.primaryCtaLabel}>
                    {savingLocation ? t('settings.location.saving') : t('settings.location.save')}
                  </AppText>
                </Button>
              </>
            )}
          </View>
        </AnimatedSection>

        <AnimatedSection index={5}>
          <View style={[styles.card, shadow.soft]}>
            <SectionLabel icon={Shield} title={t('settings.legal.title')} />
            <Button
              style={styles.linkRow}
              onPress={() => void openLegalUrl(LEGAL_URLS.privacy)}
              variant="plain"
            >
              <View style={styles.rowLeading}>
                <View style={styles.rowIcon}>
                  <Shield color={ACCENT} size={16} strokeWidth={2.2} />
                </View>
                <AppText variant="body" style={styles.rowLabel}>
                  {t('settings.legal.privacy')}
                </AppText>
              </View>
            </Button>
            <View style={styles.divider} />
            <Button
              style={styles.linkRow}
              onPress={() => void openLegalUrl(LEGAL_URLS.terms)}
              variant="plain"
            >
              <View style={styles.rowLeading}>
                <View style={styles.rowIcon}>
                  <FileText color={ACCENT} size={16} strokeWidth={2.2} />
                </View>
                <AppText variant="body" style={styles.rowLabel}>
                  {t('settings.legal.terms')}
                </AppText>
              </View>
            </Button>
          </View>
        </AnimatedSection>

        {!isGuest ? (
          <AnimatedSection index={6}>
            <View style={[styles.card, shadow.soft]}>
              <SectionLabel icon={Trash2} title={t('settings.account.title')} />
              <AppText variant="caption" style={styles.muted}>
                {t('settings.account.deleteHint')}
              </AppText>
              <Button
                style={[styles.dangerCta, deletingAccount ? styles.ctaDisabled : null, shadow.soft]}
                disabled={deletingAccount}
                onPress={confirmDeleteAccount}
                variant="plain"
              >
                <Trash2 color="#FFFFFF" size={16} strokeWidth={2.25} />
                <AppText variant="button" style={styles.primaryCtaLabel}>
                  {deletingAccount ? t('settings.account.deleting') : t('settings.account.delete')}
                </AppText>
              </Button>
            </View>
          </AnimatedSection>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: typeof Settings; title: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionIcon}>
        <Icon color={ACCENT} size={14} strokeWidth={2.3} />
      </View>
      <AppText variant="caption" style={styles.sectionEyebrow}>
        {title}
      </AppText>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  trailing,
}: {
  icon: typeof Settings;
  label: string;
  trailing: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeading}>
        <View style={styles.rowIcon}>
          <Icon color={ACCENT} size={16} strokeWidth={2.2} />
        </View>
        <AppText variant="body" style={styles.rowLabel}>
          {label}
        </AppText>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 160,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  heroBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E2E8F0',
    opacity: 0.7,
    top: -48,
    right: -36,
  },
  heroBlobSm: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.1,
    bottom: 16,
    left: -12,
  },
  heroIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: `${ACCENT}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACCENT}14`,
  },
  heroEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heroTitle: {
    color: TITLE,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    color: palette.text,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  fieldLabel: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: SOFT,
    borderColor: ACCENT,
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextSelected: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
  },
  muted: {
    color: palette.textSecondary,
  },
  linkRow: {
    paddingVertical: 4,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: spacing.xs,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  dangerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: spacing.xs,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: SOFT,
    paddingVertical: 14,
  },
  secondaryCtaLabel: {
    color: ACCENT,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
});
