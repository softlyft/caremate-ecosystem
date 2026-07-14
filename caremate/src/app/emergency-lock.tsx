import { useQuery } from '@tanstack/react-query';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { Card, LoadingState, Screen } from '@/components/ui/screen-states';
import { readEmergencyLockSnapshot } from '@/domains/emergency/lock-surface';
import { palette, spacing } from '@/theme';

/**
 * Public emergency card for responders.
 * Reachable via caremate://emergency-lock without signing in.
 * Native widgets show the same minimal fields on the Lock/Home Screen.
 */
export default function EmergencyLockScreen() {
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['emergency-lock-surface'],
    queryFn: readEmergencyLockSnapshot,
  });

  if (query.isLoading) {
    return <LoadingState title="Loading emergency info..." />;
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
            EMERGENCY · LOCK SCREEN CARD
          </AppText>
        </View>

        {!snapshot?.hasProfile ? (
          <Card>
            <AppText variant="screenTitle">No emergency profile</AppText>
            <AppText variant="body">
              Open CareMate, create an Emergency Health Profile, and enable lock-screen visibility.
            </AppText>
          </Card>
        ) : (
          <>
            <Card>
              <AppText variant="screenTitle">{snapshot.fullName}</AppText>
              <InfoRow label="Blood group" value={snapshot.bloodGroup || 'Not set'} />
              <InfoRow label="Genotype" value={snapshot.genotype || 'Not set'} />
              <InfoRow label="Allergies" value={snapshot.allergies || 'None listed'} />
            </Card>

            <Card>
              <AppText variant="cardTitle">Emergency contact</AppText>
              {snapshot.contactName ? (
                <>
                  <InfoRow label="Name" value={snapshot.contactName} />
                  <InfoRow label="Relationship" value={snapshot.contactRelationship || '—'} />
                  <InfoRow label="Phone" value={snapshot.contactPhone || '—'} />
                  {snapshot.contactPhone ? (
                    <Button
                      label="Call emergency contact"
                      onPress={() => Linking.openURL(`tel:${snapshot.contactPhone}`)}
                    />
                  ) : null}
                </>
              ) : (
                <AppText variant="caption">No ICE contact saved.</AppText>
              )}
            </Card>
          </>
        )}

        <AppText variant="caption" style={styles.footnote}>
          {Platform.OS === 'ios'
            ? 'Add the CareMate Emergency Info widget to your Lock Screen for glanceable access when the device is locked.'
            : 'Add the CareMate Emergency Info widget to your Home Screen. On Android, emergency responders can also open this card from the widget.'}
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
