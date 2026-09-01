import { router } from 'expo-router';
import { ShieldPlus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { ChoiceChip, FormField, FormStack, Input } from '@/components/ui/form-controls';
import { BLOOD_GROUPS, GENOTYPES } from '@/domains/emergency/constants';
import { useTranslation } from '@/domains/localization';
import { saveOnboardingEmergencyBasics, useOnboardingDraftStore } from '@/domains/onboarding';
import {
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
  OnboardingShell,
} from '@/domains/onboarding/OnboardingShell';
import { ONBOARDING_STEP_THEMES } from '@/domains/onboarding/themes';
import { radius, shadow, spacing } from '@/theme';

const theme = ONBOARDING_STEP_THEMES[2];
const CHIP_ACCENT = theme.accent;
const CHIP_SOFT = theme.soft;

export default function OnboardingEmergencyBasicsScreen() {
  const { t } = useTranslation();
  const draftBloodGroup = useOnboardingDraftStore((s) => s.bloodGroup);
  const draftGenotype = useOnboardingDraftStore((s) => s.genotype);
  const draftAllergies = useOnboardingDraftStore((s) => s.allergies);
  const setEmergencyBasics = useOnboardingDraftStore((s) => s.setEmergencyBasics);
  const markEmergencyBasicsSaved = useOnboardingDraftStore((s) => s.markEmergencyBasicsSaved);
  const skipEmergencyBasics = useOnboardingDraftStore((s) => s.skipEmergencyBasics);

  const [bloodGroup, setBloodGroup] = useState(draftBloodGroup);
  const [genotype, setGenotype] = useState(draftGenotype);
  const [allergies, setAllergies] = useState(draftAllergies);
  const [busy, setBusy] = useState(false);

  const canSave = Boolean(bloodGroup && genotype);

  async function handleSave() {
    if (!canSave || busy) {
      return;
    }
    setBusy(true);
    try {
      setEmergencyBasics({ bloodGroup, genotype, allergies });
      await saveOnboardingEmergencyBasics({ bloodGroup, genotype, allergies });
      markEmergencyBasicsSaved();
      router.push('/(auth)/onboarding/location');
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    skipEmergencyBasics();
    router.push('/(auth)/onboarding/location');
  }

  return (
    <OnboardingShell
      step={2}
      title={t('onboarding.emergencyBasics.title')}
      subtitle={t('onboarding.emergencyBasics.subtitle')}
      onSkip={handleSkip}
      skipLabel={t('onboarding.emergencyBasics.skip')}
      busy={busy}
      hero={
        <View style={[styles.heroShell, shadow.soft]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: theme.soft },
              { offset: '100%', color: theme.softEnd },
            ]}
            angle={125}
            style={styles.hero}
          >
            <View style={[styles.heroIcon, { borderColor: `${theme.accent}33` }]}>
              <ShieldPlus color={theme.accent} size={28} strokeWidth={2.2} />
            </View>
          </LinearGradientFill>
        </View>
      }
      footer={
        <>
          <OnboardingPrimaryButton
            label={t('onboarding.emergencyBasics.saveContinue')}
            accent={theme.accent}
            disabled={!canSave}
            loading={busy}
            onPress={() => void handleSave()}
          />
          <OnboardingSecondaryButton
            label={t('onboarding.emergencyBasics.skip')}
            accent={theme.accent}
            soft={theme.soft}
            disabled={busy}
            onPress={handleSkip}
          />
        </>
      }
    >
      <Animated.View entering={FadeInDown.duration(420)}>
        <FormStack>
          <FormField label={t('emergency.fields.bloodGroup')}>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map((group) => (
                <ChoiceChip
                  key={group}
                  label={group}
                  selected={bloodGroup === group}
                  onPress={() => setBloodGroup(group)}
                  accent={CHIP_ACCENT}
                  soft={CHIP_SOFT}
                  disabled={busy}
                />
              ))}
            </View>
          </FormField>

          <FormField label={t('emergency.fields.genotype')}>
            <View style={styles.chipRow}>
              {GENOTYPES.map((item) => (
                <ChoiceChip
                  key={item}
                  label={item}
                  selected={genotype === item}
                  onPress={() => setGenotype(item)}
                  accent={CHIP_ACCENT}
                  soft={CHIP_SOFT}
                  disabled={busy}
                />
              ))}
            </View>
          </FormField>

          <FormField label={t('emergency.fields.allergies')}>
            <Input
              placeholder={t('onboarding.emergencyBasics.allergiesHint')}
              value={allergies}
              onChangeText={setAllergies}
              editable={!busy}
            />
          </FormField>
        </FormStack>
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: spacing.xs,
  },
  hero: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
