import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card, EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { emergencyRepository } from '@/domains/emergency/repository';
import { useAppTheme } from '@/theme';

export default function EmergencyQrScreen() {
  const { colors } = useAppTheme();
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });

  if (query.isLoading) {
    return <LoadingState title="Preparing QR code..." />;
  }

  const profile = query.data;
  if (!profile) {
    return (
      <EmptyState
        title="No emergency profile"
        message="Create a profile before generating a QR code."
      />
    );
  }

  const payload = JSON.stringify({
    name: profile.fullName,
    bloodGroup: profile.bloodGroup,
    allergies: profile.allergies,
    medications: profile.currentMedications,
    contacts: profile.emergencyContacts,
  });

  return (
    <Screen>
      <Card>
        <AppText variant="cardTitle">Emergency QR Payload</AppText>
        <AppText variant="caption">
          QR rendering will use an Edge Function or on-device encoder in a follow-up. For now, this
          screen exposes the offline emergency payload.
        </AppText>
        <View
          style={[
            styles.qrPlaceholder,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <AppText variant="caption" style={styles.preview}>
            QR preview
          </AppText>
        </View>
        <AppText variant="navLabel" selectable>
          {payload}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrPlaceholder: {
    height: 180,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    textAlign: 'center',
  },
});
