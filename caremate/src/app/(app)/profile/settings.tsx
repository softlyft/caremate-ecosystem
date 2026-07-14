import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { Switch } from '@/components/ui/switch';
import { QUERY_KEYS } from '@/constants/config';
import { getCountryName, NEWS_COUNTRIES, NIGERIA_STATES } from '@/constants/locations';
import { useSettingsStore } from '@/domains/profile/store';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { profileRepository } from '@/domains/profile/repository';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();

  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const remoteCountryCode = profileQuery.data?.countryCode ?? null;
  const remoteState = profileQuery.data?.state ?? '';
  const [countryDraft, setCountryDraft] = useState<string | null | undefined>(undefined);
  const [stateDraft, setStateDraft] = useState<string | undefined>(undefined);
  const [savingLocation, setSavingLocation] = useState(false);

  const countryCode = countryDraft !== undefined ? countryDraft : remoteCountryCode;
  const state = stateDraft !== undefined ? stateDraft : remoteState;
  async function updateTheme(value: 'light' | 'dark' | 'system') {
    setTheme(value);
    await profileRepository.saveSettings(userId, { theme: value });
  }

  async function updateNotifications(value: boolean) {
    setNotificationsEnabled(value);
    await profileRepository.saveSettings(userId, { notificationsEnabled: value });
  }

  async function saveLocation() {
    if (isGuest) {
      return;
    }

    setSavingLocation(true);
    try {
      await profileRepository.save(userId, {
        countryCode,
        state: state.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trendingArticles });
      setCountryDraft(undefined);
      setStateDraft(undefined);
    } finally {
      setSavingLocation(false);
    }
  }

  if (!isGuest && profileQuery.isLoading) {
    return <LoadingState title="Loading settings..." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <AppText variant="cardTitle">Family</AppText>
        {isGuest ? (
          <AppText variant="caption" style={styles.muted}>
            Sign in to set up your family profile, kids, and spouse connection.
          </AppText>
        ) : (
          <>
            <AppText variant="caption" style={styles.muted}>
              Add children and connect your spouse. Each parent keeps their own CareMate data.
            </AppText>
            <Button
              label="Open family"
              variant="secondary"
              onPress={() => router.push('/(app)/family')}
            />
          </>
        )}
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Appearance</AppText>
        <View style={styles.row}>
          <AppText variant="body">Use system theme</AppText>
          <Switch
            value={theme === 'system'}
            onValueChange={(enabled) => updateTheme(enabled ? 'system' : 'light')}
          />
        </View>
        <View style={styles.row}>
          <AppText variant="body">Dark mode</AppText>
          <Switch
            value={theme === 'dark'}
            onValueChange={(enabled) => updateTheme(enabled ? 'dark' : 'light')}
          />
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notifications</AppText>
        <View style={styles.row}>
          <AppText variant="body">Push notifications</AppText>
          <Switch value={notificationsEnabled} onValueChange={updateNotifications} />
        </View>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Location</AppText>
        {isGuest ? (
          <AppText variant="caption" style={styles.muted}>
            Sign in to set your country and state. Guests see international health news.
          </AppText>
        ) : (
          <>
            <AppText variant="caption" style={styles.muted}>
              Used for local health news. Leave unset to see international stories.
            </AppText>

            <AppText variant="body">Country</AppText>
            <View style={styles.chipRow}>
              {NEWS_COUNTRIES.map((country) => {
                const selected = countryCode === country.code;
                return (
                  <Pressable
                    key={country.code}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setCountryDraft(selected ? null : country.code);
                      if (country.code !== 'NG') {
                        setStateDraft('');
                      }
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : undefined}
                    >
                      {country.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {countryCode === 'NG' ? (
              <>
                <AppText variant="body">State</AppText>
                <View style={styles.chipRow}>
                  {NIGERIA_STATES.map((item) => {
                    const selected = state === item;
                    return (
                      <Pressable
                        key={item}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setStateDraft(selected ? '' : item)}
                      >
                        <AppText
                          variant="caption"
                          style={selected ? styles.chipTextSelected : undefined}
                        >
                          {item}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <AppText variant="body">State / region</AppText>
                <Input
                  placeholder="e.g. California, Greater Accra"
                  value={state}
                  onChangeText={setStateDraft}
                  autoCapitalize="words"
                />
              </>
            )}

            {(countryCode || state) && (
              <AppText variant="caption" style={styles.muted}>
                Selected:{' '}
                {[getCountryName(countryCode), state].filter(Boolean).join(' · ') || 'Not set'}
              </AppText>
            )}

            <Button
              label={savingLocation ? 'Saving...' : 'Save location'}
              disabled={savingLocation}
              onPress={saveLocation}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: palette.background,
  },
  chipSelected: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipTextSelected: {
    color: palette.primaryDark,
  },
  muted: {
    color: palette.textSecondary,
  },
});
