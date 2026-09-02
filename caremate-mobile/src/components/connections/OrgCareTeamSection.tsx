import { useMutation, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { MessageCircle, UserRound } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import {
  listConnectedOrgCareTeam,
  type OrgCareTeamKind,
  type OrgCareTeamMember,
} from '@/domains/connections/care-team';
import { formatCareTeamMessageAlert } from '@/domains/messaging/errors';
import { openOrgPatientConversation, startDirectConversation } from '@/domains/messaging/repository';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

async function openCareTeamMessage(input: {
  orgKind: OrgCareTeamKind;
  orgId: string;
  member: OrgCareTeamMember;
}): Promise<{ conversationId: string }> {
  if (input.member.messageViaOrgInbox) {
    return openOrgPatientConversation({
      organizationId: input.orgId,
      orgKind: input.orgKind,
    });
  }

  return startDirectConversation({
    otherUserId: input.member.userId,
    organizationId: input.orgId,
    orgKind: input.orgKind,
  });
}

export function OrgCareTeamSection({
  orgKind,
  orgId,
  enabled,
}: {
  orgKind: OrgCareTeamKind;
  orgId: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const isProvider = orgKind === 'provider';

  const query = useQuery({
    queryKey: [...QUERY_KEYS.connections, 'care-team', orgKind, orgId],
    queryFn: () => listConnectedOrgCareTeam(orgKind, orgId),
    enabled: enabled && Boolean(orgId),
    staleTime: 60_000,
  });

  const messageMutation = useMutation({
    mutationFn: (member: OrgCareTeamMember) => openCareTeamMessage({ orgKind, orgId, member }),
    onSuccess: ({ conversationId }) => {
      router.push(`/(app)/messages/${conversationId}` as Href);
    },
    onError: (error, member) => {
      Alert.alert(
        t('nearby.careTeam.messageFailedTitle'),
        formatCareTeamMessageAlert(error, member.messageViaOrgInbox, t),
      );
    },
  });

  if (!enabled) {
    return null;
  }

  const title = isProvider ? t('nearby.careTeam.providerTitle') : t('nearby.careTeam.payerTitle');
  const subtitle = isProvider
    ? t('nearby.careTeam.providerSubtitle')
    : t('nearby.careTeam.payerSubtitle');

  return (
    <View style={[styles.card, shadow.soft]}>
      <AppText variant="caption" color="brand" style={styles.eyebrow}>
        {title}
      </AppText>
      <AppText variant="subtitle" style={styles.subtitle}>
        {subtitle}
      </AppText>

      {query.isLoading ? (
        <AppText variant="body" style={styles.muted}>
          {t('nearby.careTeam.loading')}
        </AppText>
      ) : query.isError ? (
        <AppText variant="body" style={styles.muted}>
          {t('nearby.careTeam.loadFailed')}
        </AppText>
      ) : (query.data ?? []).length === 0 ? (
        <AppText variant="body" style={styles.muted}>
          {t('nearby.careTeam.empty')}
        </AppText>
      ) : (
        <View style={styles.list}>
          {(query.data ?? []).map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.avatar}>
                <UserRound color={palette.primary} size={18} />
              </View>
              <View style={styles.memberCopy}>
                <AppText variant="body" style={styles.memberName}>
                  {member.displayName}
                </AppText>
                {member.position ? (
                  <AppText variant="caption" style={styles.muted}>
                    {member.position}
                  </AppText>
                ) : null}
              </View>
              {member.canMessage ? (
                <Button
                  style={styles.messageButton}
                  disabled={messageMutation.isPending}
                  onPress={() => messageMutation.mutate(member)}
                  variant="plain"
                >
                  <MessageCircle color={palette.primary} size={16} />
                  <AppText variant="caption" style={styles.messageLabel}>
                    {t('nearby.careTeam.message')}
                  </AppText>
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subtitle: {
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  muted: {
    color: palette.textSecondary,
  },
  list: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCopy: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
  },
  messageLabel: {
    color: palette.primary,
    fontWeight: '600',
  },
});
