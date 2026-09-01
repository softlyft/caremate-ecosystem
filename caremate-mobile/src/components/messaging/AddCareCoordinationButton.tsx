import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  careCoordinationErrorKey,
  listCareCoordinationCandidates,
  startCareCoordinationConversation,
  type CareCoordinationCandidate,
  type MessageConversation,
} from '@/domains/messaging/repository';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export function AddCareCoordinationButton({
  conversation,
}: {
  conversation: MessageConversation;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [candidates, setCandidates] = useState<CareCoordinationCandidate[]>([]);

  const addLabel =
    conversation.org_side === 'payer'
      ? t('messages.addProviderToChat')
      : t('messages.addPayerToChat');

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCareCoordinationCandidates(conversation.id);
      setCandidates(rows);
    } catch {
      Alert.alert(t('messages.coordinationFailedTitle'), t('messages.coordinationLoadFailed'));
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [conversation.id, t]);

  useEffect(() => {
    if (!open) return;
    void loadCandidates();
  }, [open, loadCandidates]);

  if (conversation.kind !== 'org_patient') {
    return null;
  }

  return (
    <>
      <Button
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        variant="plain"
      >
        <Users color={palette.primaryDark} size={16} strokeWidth={2.2} />
        <AppText variant="seeAll" style={styles.buttonLabel}>
          {addLabel}
        </AppText>
      </Button>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <AppText variant="cardTitle" style={styles.sheetTitle}>
            {addLabel}
          </AppText>
          <AppText variant="caption" style={styles.sheetHint}>
            {t('messages.coordinationHint')}
          </AppText>

          {loading ? (
            <ActivityIndicator color={palette.primary} style={styles.loader} />
          ) : candidates.length === 0 ? (
            <AppText variant="body" style={styles.empty}>
              {t('messages.coordinationNoCandidates')}
            </AppText>
          ) : (
            candidates.map((candidate) => (
              <Button
                key={candidate.organization_id}
                style={styles.option}
                disabled={starting}
                onPress={() => {
                  void (async () => {
                    setStarting(true);
                    try {
                      const nextId = await startCareCoordinationConversation({
                        sourceConversationId: conversation.id,
                        candidate,
                      });
                      setOpen(false);
                      router.replace(`/(app)/messages/${nextId}`);
                    } catch (error) {
                      Alert.alert(
                        t('messages.coordinationFailedTitle'),
                        t(careCoordinationErrorKey(error)),
                      );
                    } finally {
                      setStarting(false);
                    }
                  })();
                }}
                variant="plain"
              >
                <AppText variant="body">{candidate.organization_name}</AppText>
              </Button>
            ))
          )}

          <Button style={styles.cancel} onPress={() => setOpen(false)} variant="plain">
            <AppText variant="seeAll">{t('common.cancel')}</AppText>
          </Button>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  buttonLabel: {
    color: palette.primaryDark,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: {
    color: palette.text,
  },
  sheetHint: {
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  empty: {
    color: palette.textSecondary,
    paddingVertical: spacing.md,
  },
  option: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  cancel: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
});
