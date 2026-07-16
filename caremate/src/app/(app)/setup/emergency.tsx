import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { QUERY_KEYS } from '@/constants/config';
import { BLOOD_GROUPS, GENOTYPES } from '@/domains/emergency/constants';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { emergencyRepository } from '@/domains/emergency/repository';
import { isCompleteIceContact } from '@/domains/emergency/validation';
import { useTranslation } from '@/domains/localization';
import { markEmergencyEssentialsDone } from '@/domains/onboarding';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { fontFamily, palette, radius, spacing } from '@/theme';

export default function SetupEmergencyEssentialsScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [bloodGroup, setBloodGroup] = useState('');
  const [genotype, setGenotype] = useState('');
  const [allergies, setAllergies] = useState('');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [iceRelationship, setIceRelationship] = useState('');
  const [busy, setBusy] = useState(false);

  async function goNext() {
    const href = await markEmergencyEssentialsDone();
    router.replace(href);
  }

  async function handleSkip() {
    setBusy(true);
    try {
      await goNext();
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!bloodGroup || !genotype) {
      Alert.alert('Missing details', 'Select blood group and genotype to continue.');
      return;
    }
    if (
      !isCompleteIceContact({
        name: iceName,
        phone: icePhone,
        relationship: iceRelationship,
      })
    ) {
      Alert.alert(
        'ICE contact',
        'Add name, phone, and relationship for your first emergency contact.',
      );
      return;
    }

    setBusy(true);
    try {
      const existing = await emergencyRepository.findByUserId(userId);
      const saved = await emergencyRepository.save(userId, {
        fullName: existing?.fullName ?? '',
        bloodGroup,
        genotype,
        allergies: allergies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        emergencyContacts: [
          {
            name: iceName.trim(),
            phone: icePhone.trim(),
            relationship: iceRelationship.trim(),
          },
        ],
      });
      await syncEmergencyLockSurface(saved);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyProfile });
      await goNext();
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Unable to save emergency essentials',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <PressableScale onPress={() => void handleSkip()} hitSlop={8}>
          <AppText variant="body" style={styles.skip}>
            {t('setup.emergency.skip')}
          </AppText>
        </PressableScale>
      </View>

      <View style={styles.body}>
        <AppText variant="caption" style={styles.eyebrow}>
          {t('common.continue')}
        </AppText>
        <AppText variant="screenTitle" style={styles.title}>
          {t('setup.emergency.title')}
        </AppText>
        <AppText variant="subtitle" style={styles.subtitle}>
          {t('setup.emergency.subtitle')}
        </AppText>

        <AppText variant="caption" style={styles.fieldLabel}>
          {t('emergency.fields.bloodGroup')}
        </AppText>
        <View style={styles.chipRow}>
          {BLOOD_GROUPS.map((group) => {
            const selected = bloodGroup === group;
            return (
              <PressableScale
                key={group}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setBloodGroup(group)}
                scale={0.96}
              >
                <AppText
                  variant="caption"
                  style={selected ? styles.chipTextSelected : styles.chipText}
                >
                  {group}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <AppText variant="caption" style={styles.fieldLabel}>
          {t('emergency.fields.genotype')}
        </AppText>
        <View style={styles.chipRow}>
          {GENOTYPES.map((item) => {
            const selected = genotype === item;
            return (
              <PressableScale
                key={item}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setGenotype(item)}
                scale={0.96}
              >
                <AppText
                  variant="caption"
                  style={selected ? styles.chipTextSelected : styles.chipText}
                >
                  {item}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <Input
          placeholder={t('emergency.fields.allergies')}
          value={allergies}
          onChangeText={setAllergies}
        />
        <Input
          placeholder={t('emergency.edit.contactName')}
          value={iceName}
          onChangeText={setIceName}
          autoCapitalize="words"
        />
        <Input
          placeholder={t('emergency.edit.relationship')}
          value={iceRelationship}
          onChangeText={setIceRelationship}
          autoCapitalize="words"
        />
        <Input
          placeholder={t('emergency.edit.contactPhone')}
          value={icePhone}
          onChangeText={setIcePhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.footer}>
        <PressableScale
          style={[styles.primaryCta, busy ? styles.disabled : null]}
          disabled={busy}
          onPress={() => void handleSave()}
        >
          <AppText variant="button" style={styles.primaryLabel}>
            {busy ? t('common.saving') : t('setup.emergency.save')}
          </AppText>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skip: {
    color: palette.primary,
    fontFamily: fontFamily.semiBold,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: palette.brandPurple,
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    fontSize: 11,
  },
  title: {
    color: palette.brandPurpleDark,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: palette.brandPurple,
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
    backgroundColor: palette.background,
  },
  chipSelected: {
    backgroundColor: palette.purpleLight,
    borderColor: palette.brandPurple,
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextSelected: {
    color: palette.brandPurple,
    fontFamily: fontFamily.semiBold,
  },
  footer: {
    padding: spacing.lg,
  },
  primaryCta: {
    backgroundColor: palette.brandPurple,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
});
