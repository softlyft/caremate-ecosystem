import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, ChoiceChip, FormField, FormStack, Input } from '@/components/ui/form-controls';
import { QUERY_KEYS } from '@/constants/config';
import { BLOOD_GROUPS, GENOTYPES } from '@/domains/emergency/constants';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import { emergencyRepository } from '@/domains/emergency/repository';
import {
  isValidIcePhone,
  isValidPersonName,
  sanitizePhoneInput,
  sanitizePersonNameInput,
  ICE_PHONE_MAX_CHARS,
  PERSON_NAME_MAX_CHARS,
} from '@/domains/emergency/validation';
import { useTranslation } from '@/domains/localization';
import { markEmergencyEssentialsDone } from '@/domains/onboarding';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { useScheduleFocusedInputScroll } from '@/hooks/use-keyboard-aware-scroll';
import { syncEngine } from '@/sync/engine';
import { fontFamily, palette, radius, spacing } from '@/theme';

const CHIP_ACCENT = palette.brandPurple;
const CHIP_SOFT = palette.purpleLight;
/** Skip row inside the safe area (not the status-bar inset). */
const SETUP_HEADER_HEIGHT = 48;

export default function SetupEmergencyEssentialsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardApi = useScheduleFocusedInputScroll(scrollRef, scrollYRef, keyboardTopRef);
  const [bloodGroup, setBloodGroup] = useState('');
  const [genotype, setGenotype] = useState('');
  const [allergies, setAllergies] = useState('');
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [iceRelationship, setIceRelationship] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    void emergencyRepository.findByUserId(userId).then((profile) => {
      if (!active || !profile) {
        return;
      }
      if (profile.bloodGroup) {
        setBloodGroup(profile.bloodGroup);
      }
      if (profile.genotype) {
        setGenotype(profile.genotype);
      }
      if (profile.allergies.length) {
        setAllergies(profile.allergies.join(', '));
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      keyboardApi.scheduleScrollIntoView();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardApi]);

  async function goNext() {
    const href = await markEmergencyEssentialsDone();
    router.replace(href);
  }

  async function handleSkip() {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await goNext();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleSave() {
    if (busyRef.current) {
      return;
    }
    if (!bloodGroup || !genotype) {
      Alert.alert(
        t('emergency.setupWizard.missingDetailsTitle'),
        t('emergency.setupWizard.missingDetailsMessage'),
      );
      return;
    }
    if (!iceName.trim() || !icePhone.trim() || !iceRelationship.trim()) {
      Alert.alert(
        t('emergency.setupWizard.iceContactTitle'),
        t('emergency.setupWizard.iceContactRequired'),
      );
      return;
    }
    if (!isValidPersonName(iceName)) {
      Alert.alert(t('emergency.setupWizard.iceContactTitle'), t('emergency.edit.nameInvalid'));
      return;
    }
    if (!isValidIcePhone(icePhone)) {
      Alert.alert(
        t('emergency.setupWizard.iceContactTitle'),
        t('emergency.edit.contactPhoneInvalid'),
      );
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const existing = await emergencyRepository.findByUserId(userId);
      await emergencyRepository.save(userId, {
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
      await syncEmergencyLockSurface(null);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyProfile });
      syncEngine.requestSync({ reason: 'write', immediate: true });
      await goNext();
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Unable to save emergency essentials',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Extra scroll room so bottom ICE fields + Save can rise above the keyboard.
  // Applied on both platforms: Android adjustResize alone is not enough for late fields.
  const bottomPad =
    keyboardHeight > 0
      ? Math.max(keyboardHeight - insets.bottom, 0) + spacing.xl * 2
      : spacing.xl;
  // SafeAreaView already applies the top inset; only offset for the in-layout skip row.
  const keyboardVerticalOffset = Platform.OS === 'ios' ? SETUP_HEADER_HEIGHT : 0;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.header}>
          <Button onPress={() => void handleSkip()} hitSlop={8} disabled={busy} variant="plain">
            <AppText variant="body" style={styles.skip}>
              {t('setup.emergency.skip')}
            </AppText>
          </Button>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.body, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          // Avoid stacking RN content insets on top of KeyboardAvoidingView + our bottom pad.
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          <AppText variant="caption" style={styles.eyebrow}>
            {t('common.continue')}
          </AppText>
          <AppText variant="screenTitle" style={styles.title}>
            {t('setup.emergency.title')}
          </AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {t('setup.emergency.subtitle')}
          </AppText>

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
                placeholder={t('emergency.fields.allergies')}
                value={allergies}
                onChangeText={setAllergies}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('emergency.edit.contactName')}>
              <Input
                placeholder={t('emergency.edit.contactName')}
                value={iceName}
                onChangeText={(value) => setIceName(sanitizePersonNameInput(value))}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={PERSON_NAME_MAX_CHARS}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('emergency.edit.relationship')}>
              <Input
                placeholder={t('emergency.edit.relationship')}
                value={iceRelationship}
                onChangeText={setIceRelationship}
                autoCapitalize="words"
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('emergency.edit.contactPhone')}>
              <Input
                placeholder={t('emergency.edit.contactPhone')}
                value={icePhone}
                onChangeText={(value) => setIcePhone(sanitizePhoneInput(value))}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={ICE_PHONE_MAX_CHARS}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>
          </FormStack>

          <View style={styles.footer}>
            <Button
              label={busy ? t('common.saving') : t('setup.emergency.save')}
              style={styles.primaryCta}
              loading={busy}
              onPress={() => void handleSave()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: SETUP_HEADER_HEIGHT,
  },
  skip: {
    color: palette.primary,
    fontFamily: fontFamily.semiBold,
  },
  body: {
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  primaryCta: {
    backgroundColor: palette.brandPurple,
    borderRadius: radius.xl,
  },
});
