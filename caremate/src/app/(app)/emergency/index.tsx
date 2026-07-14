import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { Card, EmptyState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { emergencyRepository } from '@/domains/emergency/repository';
import { spacing } from '@/theme/colors';

export default function EmergencyViewScreen() {
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });

  if (query.isLoading) {
    return <LoadingState title="Loading emergency profile..." />;
  }

  const profile = query.data;
  if (!profile) {
    return (
      <EmptyState
        title="No emergency profile yet"
        message="Add your critical health details for offline access."
        actionLabel="Create Profile"
        onAction={() => router.push('/(app)/emergency/edit')}
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <AppText variant="screenTitle">{profile.fullName}</AppText>
          <InfoRow label="Blood group" value={profile.bloodGroup} />
          <InfoRow label="Genotype" value={profile.genotype} />
          <InfoRow label="Allergies" value={profile.allergies.join(', ') || 'None'} />
          <InfoRow label="Medications" value={profile.currentMedications.join(', ') || 'None'} />
          <InfoRow label="Conditions" value={profile.chronicConditions.join(', ') || 'None'} />
          <InfoRow label="Preferred hospital" value={profile.preferredHospital} />
          <InfoRow label="Insurance" value={profile.insuranceProvider} />
          <InfoRow label="Notes" value={profile.notes} />
        </Card>

        <Card>
          <AppText variant="cardTitle">Emergency Contacts</AppText>
          {profile.emergencyContacts.length === 0 ? (
            <AppText variant="caption">No contacts added.</AppText>
          ) : (
            profile.emergencyContacts.map((contact) => (
              <View key={`${contact.name}-${contact.phone}`} style={styles.contact}>
                <AppText variant="quickActionTitle">{contact.name}</AppText>
                <AppText variant="caption">{contact.relationship}</AppText>
                <AppText variant="caption">{contact.phone}</AppText>
              </View>
            ))
          )}
        </Card>

        <Card>
          <AppText variant="cardTitle">Lock Screen access</AppText>
          <AppText variant="body">
            {Platform.OS === 'ios'
              ? 'Add the CareMate “Emergency Info” widget to your Lock Screen (long-press Lock Screen → Customize → Add Widget).'
              : 'Add the CareMate “Emergency Info” widget to your Home Screen (long-press home → Widgets).'}
          </AppText>
          <AppText variant="caption">
            Minimal fields shown: name, blood group, genotype, allergies, and your first ICE
            contact.
          </AppText>
        </Card>

        <View style={styles.actions}>
          <Button label="Edit Profile" onPress={() => router.push('/(app)/emergency/edit')} />
          <Button
            label="Preview lock-screen card"
            variant="secondary"
            onPress={() => router.push('/emergency-lock')}
          />
          <Button
            label="Show QR Code"
            variant="secondary"
            onPress={() => router.push('/(app)/emergency/qr')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="body">{value || 'Not set'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: 2,
  },
  contact: {
    gap: 2,
  },
  actions: {
    gap: spacing.sm,
  },
});
