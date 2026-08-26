import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Baby, Copy, Link2, Share2, UserPlus, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import {
  FAMILY_GENDERS,
  buildSpouseInviteMessage,
  familyConnectionService,
  familyRepository,
  validateChildNameAndDob,
} from '@/domains/family';
import type { FamilyLookupUser, FamilyMemberGender } from '@/domains/family/types';
import {
  FAMILY_ADULT_INVITE_LIMIT,
  canAddChild,
  canConnectSpouse,
  canInviteFamilyMember,
  familyAdultInviteSeatsRemaining,
} from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { profileRepository } from '@/domains/profile/repository';
import { usePremiumTier } from '@/hooks/use-premium-state';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = palette.brandBlue;
const SOFT = palette.brandBlueLight;
const SOFT_END = '#EFF6FF';
const TITLE = palette.brandBlue;

function formatDob(value: string | null): string {
  if (!value) return '—';
  return value;
}

export default function FamilyHubScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const tier = usePremiumTier();
  const queryClient = useQueryClient();

  const householdQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyHousehold, userId],
    queryFn: () => familyRepository.findHouseholdForUser(userId),
    enabled: !isGuest,
  });

  const householdId = householdQuery.data?.id;

  const membersQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, householdId],
    queryFn: () => familyRepository.listMembers(householdId!),
    enabled: Boolean(householdId),
  });

  const requestsQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyRequests, userId],
    queryFn: () => familyRepository.listIncomingRequests(userId),
    enabled: !isGuest,
  });

  const pendingOutgoingQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyRequests, 'outgoing', householdId],
    queryFn: () => familyRepository.listPendingRequestsForHousehold(householdId!),
    enabled: Boolean(householdId),
  });

  const [lookup, setLookup] = useState('');
  const [matched, setMatched] = useState<FamilyLookupUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState<FamilyMemberGender>('prefer_not_to_say');

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
    enabled: !isGuest,
  });

  const outsideInviteMessage = useMemo(() => {
    const fromName = profileQuery.data?.fullName?.trim() || t('family.defaultParentName');
    return buildSpouseInviteMessage({ fromName }).message;
  }, [profileQuery.data?.fullName, t]);

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyHousehold });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyRequests });
  }

  async function handleLookup() {
    setBusy(true);
    setMatched(null);
    setNotFound(false);
    setInviteCopied(false);
    try {
      const user = await familyConnectionService.lookupUser(lookup);
      if (user) {
        setMatched(user);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.lookupFailedMessage');
      Alert.alert(t('family.lookupFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    if (!householdId || !matched) return;
    if (!canConnectSpouse(tier)) {
      Alert.alert(t('family.spousePremiumTitle'), t('family.spousePremiumMessage'));
      return;
    }
    const invitedCount = (membersQuery.data ?? []).filter((m) => m.kind === 'spouse').length;
    const pendingCount = pendingOutgoingQuery.data?.length ?? 0;
    if (!canInviteFamilyMember(tier, invitedCount + pendingCount)) {
      Alert.alert(t('family.spousePremiumTitle'), t('family.inviteSeatsFull'));
      return;
    }
    setBusy(true);
    try {
      const profile = await profileRepository.findByUserId(userId);
      await familyConnectionService.requestConnection({
        householdId,
        fromUserId: userId,
        fromName: profile?.fullName ?? t('family.defaultParentName'),
        emailOrPhone: lookup,
        matchedUser: matched,
      });
      Alert.alert(t('family.requestSent'), t('family.requestSentMessage'));
      setMatched(null);
      setLookup('');
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.connectionFailedMessage');
      Alert.alert(t('family.connectionFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    Alert.alert(t('family.removeMemberTitle'), t('family.removeMemberMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('family.removeMember'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await familyConnectionService.removeAdultMember({ memberId, userId });
              await refreshAll();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : t('family.removeMemberFailed');
              Alert.alert(t('family.removeMemberFailed'), message);
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function handleCancelInvite(requestId: string) {
    setBusy(true);
    try {
      await familyConnectionService.cancelRequest({ requestId, userId });
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.cancelInviteFailed');
      Alert.alert(t('family.cancelInviteFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyInvite() {
    await Clipboard.setStringAsync(outsideInviteMessage);
    setInviteCopied(true);
  }

  async function handleShareInvite() {
    await Share.share({ message: outsideInviteMessage });
  }

  async function handleAddChild() {
    if (!householdId) return;
    const currentChildCount = (membersQuery.data ?? []).filter(
      (member) => member.kind === 'child',
    ).length;
    if (!canAddChild(tier, currentChildCount)) {
      Alert.alert(t('family.childLimitTitle'), t('family.childLimitMessage'));
      return;
    }
    const validated = validateChildNameAndDob(childName, childDob);
    if (!validated.ok) {
      const message =
        validated.reason === 'name'
          ? t('family.child.nameRequired')
          : validated.reason === 'dobFormat'
            ? t('family.child.dobFormat')
            : t('family.child.dobInvalid');
      Alert.alert(t('family.missingDetails'), message);
      return;
    }
    setBusy(true);
    try {
      await familyRepository.addChild(householdId, {
        fullName: validated.fullName,
        dateOfBirth: validated.dateOfBirth,
        gender: childGender,
      });
      setChildName('');
      setChildDob('');
      setChildGender('prefer_not_to_say');
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.addChildFailedMessage');
      Alert.alert(t('family.addChildFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  if (isGuest) {
    return (
      <View
        style={[styles.screen, styles.guestWrap, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={[styles.heroShell, shadow.card]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: SOFT },
              { offset: '100%', color: SOFT_END },
            ]}
            angle={130}
            style={styles.heroCompact}
          >
            <Users color={ACCENT} size={28} strokeWidth={2.2} />
            <AppText variant="screenTitle" style={styles.heroTitle}>
              {t('family.title')}
            </AppText>
            <AppText variant="subtitle" style={styles.heroSubtitle}>
              {t('family.guestSubtitle')}
            </AppText>
          </LinearGradientFill>
        </View>
        <Button
          style={[styles.primaryCta, shadow.soft]}
          onPress={() => router.push('/(auth)/login')}
          variant="plain"
        >
          <AppText variant="button" style={styles.primaryCtaLabel}>
            {t('common.signIn')}
          </AppText>
        </Button>
      </View>
    );
  }

  if (householdQuery.isLoading) {
    return <LoadingState title={t('family.loading')} />;
  }

  if (householdQuery.isError) {
    return (
      <ErrorState
        title={t('family.loadFailed.title')}
        message={
          householdQuery.error instanceof Error
            ? householdQuery.error.message
            : t('family.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void householdQuery.refetch();
          void requestsQuery.refetch();
        }}
      />
    );
  }

  if (householdQuery.data && membersQuery.isError && membersQuery.data === undefined) {
    return (
      <ErrorState
        title={t('family.loadFailed.title')}
        message={
          membersQuery.error instanceof Error
            ? membersQuery.error.message
            : t('family.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void membersQuery.refetch();
        }}
      />
    );
  }

  if (!householdQuery.data) {
    return (
      <View style={styles.screen}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          <AnimatedSection index={0}>
            <FamilyHero title={t('family.startTitle')} subtitle={t('family.startSubtitle')} />
          </AnimatedSection>
          <AnimatedSection index={1}>
            <Button
              style={[styles.primaryCta, shadow.soft]}
              onPress={() => router.push('/(app)/family/setup')}
              variant="plain"
            >
              <UserPlus color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {t('family.setupCta')}
              </AppText>
            </Button>
          </AnimatedSection>
          {(requestsQuery.data?.length ?? 0) > 0 ? (
            <AnimatedSection index={2}>
              <Button
                style={styles.secondaryCta}
                onPress={() => router.push('/(app)/family/requests')}
                variant="plain"
              >
                <Link2 color={ACCENT} size={18} strokeWidth={2.25} />
                <AppText variant="button" style={styles.secondaryCtaLabel}>
                  {t('family.viewRequests', { count: requestsQuery.data!.length })}
                </AppText>
              </Button>
            </AnimatedSection>
          ) : null}
        </Animated.ScrollView>
      </View>
    );
  }

  const children = (membersQuery.data ?? []).filter((m) => m.kind === 'child');
  const adults = (membersQuery.data ?? []).filter((m) => m.kind !== 'child');
  const invitedAdults = adults.filter((m) => m.kind === 'spouse');
  const pendingOutgoing = pendingOutgoingQuery.data ?? [];
  const usedInviteSeats = invitedAdults.length + pendingOutgoing.length;
  const inviteSeatsRemaining = familyAdultInviteSeatsRemaining(usedInviteSeats);
  const isHouseholdOwner = householdQuery.data?.createdByUserId === userId;
  const requestCount = requestsQuery.data?.length ?? 0;
  const canAddAnotherChild = canAddChild(tier, children.length);
  const familyPlanAllowsInvite = canConnectSpouse(tier);
  const canSendInvite = isHouseholdOwner && canInviteFamilyMember(tier, usedInviteSeats);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedSection index={0}>
          <FamilyHero
            title={t('family.yourFamily')}
            subtitle={t('family.yourFamilySubtitle')}
            meta={t('family.meta', {
              adults: adults.length,
              adultsPlural: adults.length === 1 ? '' : 's',
              children: children.length,
              childrenPlural: children.length === 1 ? '' : 'ren',
            })}
          />
        </AnimatedSection>

        {requestCount > 0 ? (
          <AnimatedSection index={1}>
            <View style={[styles.card, styles.requestCard, shadow.soft]}>
              <AppText variant="caption" style={styles.sectionEyebrow}>
                {t('family.requests.title')}
              </AppText>
              <AppText variant="body">
                {t('family.pendingRequests', {
                  count: requestCount,
                  plural: requestCount === 1 ? '' : 's',
                })}
              </AppText>
              <Button
                style={styles.secondaryCta}
                onPress={() => router.push('/(app)/family/requests')}
                variant="plain"
              >
                <Link2 color={ACCENT} size={16} strokeWidth={2.25} />
                <AppText variant="button" style={styles.secondaryCtaLabel}>
                  {t('family.reviewRequests')}
                </AppText>
              </Button>
            </View>
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('family.parentsSpouse')}
            </AppText>
            {adults.map((member, index) => (
              <View key={member.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Users color={ACCENT} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={styles.memberName}>
                      {member.fullName}
                    </AppText>
                    <AppText variant="caption" style={styles.muted}>
                      {member.kind === 'self' ? t('family.kindSelf') : t('family.kindMember')}
                    </AppText>
                  </View>
                  {isHouseholdOwner && member.kind === 'spouse' ? (
                    <Button
                      style={styles.removeChip}
                      disabled={busy}
                      onPress={() => void handleRemoveMember(member.id)}
                      variant="plain"
                    >
                      <AppText variant="caption" style={styles.removeChipLabel}>
                        {t('family.removeMember')}
                      </AppText>
                    </Button>
                  ) : null}
                </View>
              </View>
            ))}
            {adults.length === 0 ? (
              <AppText variant="caption" style={styles.muted}>
                {t('family.noAdults')}
              </AppText>
            ) : null}

            {isHouseholdOwner && pendingOutgoing.length > 0 ? (
              <>
                <AppText
                  variant="caption"
                  style={[styles.sectionEyebrow, { marginTop: spacing.md }]}
                >
                  {t('family.pendingInvites')}
                </AppText>
                {pendingOutgoing.map((invite) => (
                  <View key={invite.id} style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <UserPlus color={ACCENT} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" style={styles.memberName}>
                        {invite.toEmail || invite.toPhone || invite.toUserId || '—'}
                      </AppText>
                      <AppText variant="caption" style={styles.muted}>
                        {t('family.pendingInviteMeta')}
                      </AppText>
                    </View>
                    <Button
                      style={styles.removeChip}
                      disabled={busy}
                      onPress={() => void handleCancelInvite(invite.id)}
                      variant="plain"
                    >
                      <AppText variant="caption" style={styles.removeChipLabel}>
                        {t('family.cancelInvite')}
                      </AppText>
                    </Button>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </AnimatedSection>

        <AnimatedSection index={3}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('family.children')}
            </AppText>
            {children.map((child, index) => (
              <View key={child.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Button
                  style={styles.memberRow}
                  accessibilityRole="button"
                  accessibilityLabel={t('family.editChildA11y', { name: child.fullName })}
                  onPress={() => router.push(`/(app)/family/child/edit/${child.id}`)}
                  variant="plain"
                >
                  <View style={styles.avatar}>
                    <Baby color={ACCENT} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={styles.memberName}>
                      {child.fullName}
                    </AppText>
                    <AppText variant="caption" style={styles.muted}>
                      {t('family.dobLabel', {
                        dob: formatDob(child.dateOfBirth),
                        gender: child.gender ?? '—',
                      })}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="brand">
                    {t('family.editChild')}
                  </AppText>
                </Button>
              </View>
            ))}
            {children.length === 0 ? (
              <AppText variant="caption" style={styles.muted}>
                {t('family.noChildren')}
              </AppText>
            ) : null}

            {!canAddAnotherChild ? (
              <UpgradePrompt
                title={t('profile.premium.familyChildLimitTitle')}
                message={t('profile.premium.familyChildLimitMessage')}
              />
            ) : (
              <>
                <AppText
                  variant="caption"
                  style={[styles.sectionEyebrow, { marginTop: spacing.sm }]}
                >
                  {t('family.addAnotherChild')}
                </AppText>
                <Input
                  placeholder={t('family.child.name')}
                  value={childName}
                  onChangeText={setChildName}
                />
                <Input
                  placeholder={t('family.dobPlaceholder')}
                  value={childDob}
                  onChangeText={setChildDob}
                  autoCapitalize="none"
                />
                <View style={styles.chipRow}>
                  {FAMILY_GENDERS.map((g) => {
                    const selected = childGender === g.value;
                    return (
                      <Button
                        key={g.value}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setChildGender(g.value)}
                        scale={0.96}
                        variant="plain"
                      >
                        <AppText
                          variant="caption"
                          style={selected ? styles.chipTextSelected : styles.chipText}
                        >
                          {g.label}
                        </AppText>
                      </Button>
                    );
                  })}
                </View>
                <Button
                  style={[styles.primaryCta, busy ? styles.ctaDisabled : null, shadow.soft]}
                  disabled={busy}
                  onPress={() => void handleAddChild()}
                  variant="plain"
                >
                  <Baby color="#FFFFFF" size={18} strokeWidth={2.25} />
                  <AppText variant="button" style={styles.primaryCtaLabel}>
                    {busy ? t('common.saving') : t('family.addChild')}
                  </AppText>
                </Button>
              </>
            )}
          </View>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('family.connectSpouse')}
            </AppText>
            {!familyPlanAllowsInvite ? (
              <UpgradePrompt
                title={t('profile.premium.familySpouseTitle')}
                message={t('profile.premium.familySpouseMessage')}
              />
            ) : !isHouseholdOwner ? (
              <AppText variant="caption" style={styles.muted}>
                {t('family.memberOnlyHint')}
              </AppText>
            ) : !canSendInvite ? (
              <>
                <AppText variant="caption" style={styles.muted}>
                  {t('family.inviteSeats', {
                    used: usedInviteSeats,
                    limit: FAMILY_ADULT_INVITE_LIMIT,
                    remaining: inviteSeatsRemaining,
                  })}
                </AppText>
                <AppText variant="body" style={{ marginTop: spacing.xs }}>
                  {t('family.inviteSeatsFull')}
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="caption" style={styles.muted}>
                  {t('family.connectSpouseHint')}
                </AppText>
                <AppText variant="caption" style={[styles.muted, { marginTop: spacing.xs }]}>
                  {t('family.inviteSeats', {
                    used: usedInviteSeats,
                    limit: FAMILY_ADULT_INVITE_LIMIT,
                    remaining: inviteSeatsRemaining,
                  })}
                </AppText>
                <Input
                  placeholder={t('family.emailOrPhone')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={lookup}
                  onChangeText={setLookup}
                />
                <Button
                  style={[styles.secondaryCta, busy || !lookup.trim() ? styles.ctaDisabled : null]}
                  disabled={busy || !lookup.trim()}
                  onPress={() => void handleLookup()}
                  variant="plain"
                >
                  <AppText variant="button" style={styles.secondaryCtaLabel}>
                    {busy ? t('family.searching') : t('family.find')}
                  </AppText>
                </Button>

                {matched ? (
                  <View style={styles.foundCard}>
                    <AppText variant="cardTitle" style={{ color: TITLE }}>
                      {matched.fullName}
                    </AppText>
                    <AppText variant="caption">
                      {t('family.emailLabel', { value: matched.email ?? '—' })}
                    </AppText>
                    <AppText variant="caption">
                      {t('family.phoneLabel', { value: matched.phone ?? '—' })}
                    </AppText>
                    {matched.countryCode ? (
                      <AppText variant="caption">
                        {t('family.locationLabel', {
                          value: matched.countryCode,
                        })}
                      </AppText>
                    ) : null}
                    <Button
                      style={[styles.primaryCta, busy ? styles.ctaDisabled : null]}
                      disabled={busy}
                      onPress={() => void handleConnect()}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.primaryCtaLabel}>
                        {t('family.connect')}
                      </AppText>
                    </Button>
                  </View>
                ) : null}

                {notFound ? (
                  <View style={styles.foundCard}>
                    <AppText variant="body">{t('family.notFound')}</AppText>
                    <AppText variant="caption" style={styles.inviteHint}>
                      {t('family.outsideInviteHint')}
                    </AppText>
                    <View style={styles.inviteMessageBox}>
                      <AppText variant="caption" style={styles.inviteMessageText}>
                        {outsideInviteMessage}
                      </AppText>
                    </View>
                    <View style={styles.inviteActions}>
                      <Button
                        style={styles.secondaryCta}
                        onPress={() => void handleCopyInvite()}
                        variant="plain"
                      >
                        <Copy color={ACCENT} size={16} strokeWidth={2.25} />
                        <AppText variant="button" style={styles.secondaryCtaLabel}>
                          {inviteCopied ? t('family.copiedInvite') : t('family.copyInvite')}
                        </AppText>
                      </Button>
                      <Button
                        style={styles.secondaryCta}
                        onPress={() => void handleShareInvite()}
                        variant="plain"
                      >
                        <Share2 color={ACCENT} size={16} strokeWidth={2.25} />
                        <AppText variant="button" style={styles.secondaryCtaLabel}>
                          {t('family.shareInvite')}
                        </AppText>
                      </Button>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </AnimatedSection>
      </Animated.ScrollView>
    </View>
  );
}

function FamilyHero({ title, subtitle, meta }: { title: string; subtitle: string; meta?: string }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.heroShell, shadow.card]}>
      <LinearGradientFill
        colors={[
          { offset: '0%', color: SOFT },
          { offset: '55%', color: SOFT },
          { offset: '100%', color: SOFT_END },
        ]}
        angle={130}
        style={styles.hero}
      >
        <View style={styles.heroBlob} />
        <View style={[styles.heroBlobSm, { backgroundColor: ACCENT }]} />

        <View style={styles.heroIconRing}>
          <View style={styles.heroIconInner}>
            <Users color={ACCENT} size={28} strokeWidth={2.2} />
          </View>
        </View>

        <AppText variant="caption" style={styles.heroEyebrow}>
          {t('family.eyebrow')}
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {title}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {subtitle}
        </AppText>
        {meta ? (
          <View style={styles.metaPill}>
            <AppText variant="caption" style={styles.metaPillText}>
              {meta}
            </AppText>
          </View>
        ) : null}
      </LinearGradientFill>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  guestWrap: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 168,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  heroCompact: {
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  heroBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#BFDBFE',
    opacity: 0.65,
    top: -48,
    right: -36,
  },
  heroBlobSm: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.12,
    bottom: 16,
    left: -12,
  },
  heroIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: `${ACCENT}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACCENT}18`,
  },
  heroEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heroTitle: {
    color: TITLE,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  metaPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: `${ACCENT}22`,
  },
  metaPillText: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  requestCard: {
    borderColor: `${ACCENT}44`,
    backgroundColor: SOFT_END,
  },
  sectionEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  removeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#FEE2E2',
  },
  removeChipLabel: {
    color: '#B91C1C',
    fontFamily: fontFamily.semiBold,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontFamily: fontFamily.semiBold,
    color: palette.text,
  },
  muted: {
    color: palette.textSecondary,
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
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: SOFT,
    borderColor: ACCENT,
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextSelected: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
  },
  foundCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: SOFT,
    padding: spacing.md,
    gap: spacing.xs,
  },
  inviteHint: {
    color: palette.textSecondary,
  },
  inviteMessageBox: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  inviteMessageText: {
    color: palette.text,
    lineHeight: 20,
  },
  inviteActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: SOFT,
    paddingVertical: 14,
  },
  secondaryCtaLabel: {
    color: ACCENT,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
});
