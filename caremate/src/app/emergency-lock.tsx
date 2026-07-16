import { useQuery } from '@tanstack/react-query';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { Card, LoadingState, Screen } from '@/components/ui/screen-states';
import { readEmergencyLockSnapshot } from '@/domains/emergency/lock-surface';
import { useTranslation } from '@/domains/localization';
import { palette, spacing } from '@/theme';

/**
 * Public emergency card for responders.
 * Reachable via caremate://emergency-lock without signing in.
 * Native widgets show the same minimal fields on the Lock/Home Screen.
 */
export default function EmergencyLockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['emergency-lock-surface'],
    queryFn: readEmergencyLockSnapshot,
  });

  if (query.isLoading) {
    return <LoadingState title={t('emergency.lock.loading')} />;
  }

  const snapshot = query.data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>
            {t('emergency.lock.badge')}
          </AppText>
        </View>

        {!snapshot?.hasProfile ? (
          <Card>
            <AppText variant="screenTitle">{t('emergency.lock.noProfile')}</AppText>
            <AppText variant="body">{t('emergency.lock.noProfileMessage')}</AppText>
          </Card>
        ) : (
          <>
            <Card>
              <AppText variant="screenTitle">{snapshot.fullName}</AppText>
              <InfoRow
                label={t('emergency.fields.bloodGroup')}
                value={snapshot.bloodGroup || t('common.notSet')}
              />
              <InfoRow
                label={t('emergency.fields.genotype')}
                value={snapshot.genotype || t('common.notSet')}
              />
              <InfoRow
                label={t('emergency.fields.allergies')}
                value={snapshot.allergies || t('emergency.lock.noneListed')}
              />
            </Card>

            <Card>
              <AppText variant="cardTitle">{t('emergency.lock.contactTitle')}</AppText>
              {snapshot.contactName ? (
                <>
                  <InfoRow label={t('emergency.lock.contactName')} value={snapshot.contactName} />
                  <InfoRow
                    label={t('emergency.edit.relationship')}
                    value={snapshot.contactRelationship || '—'}
                  />
                  <InfoRow
                    label={t('emergency.edit.contactPhone')}
                    value={snapshot.contactPhone || '—'}
                  />
                  {snapshot.contactPhone ? (
                    <Button
                      label={t('emergency.lock.callContact')}
                      onPress={() => Linking.openURL(`tel:${snapshot.contactPhone}`)}
                    />
                  ) : null}
                </>
              ) : (
                <AppText variant="caption">{t('emergency.lock.noContact')}</AppText>
              )}
            </Card>
          </>
        )}

        <AppText variant="caption" style={styles.footnote}>
          {Platform.OS === 'ios'
            ? t('emergency.lock.footnoteIos')
            : t('emergency.lock.footnoteAndroid')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  row: {
    gap: 2,
  },
  footnote: {
    marginTop: spacing.sm,
  },
});
