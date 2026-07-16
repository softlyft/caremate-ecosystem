import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Baby, Link2, Share2, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { FAMILY_GENDERS, familyConnectionService, familyRepository } from '@/domains/family';
import type { FamilyLookupUser, FamilyMemberGender } from '@/domains/family/types';
import { profileRepository } from '@/domains/profile/repository';
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
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
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

  const [lookup, setLookup] = useState('');
  const [matched, setMatched] = useState<FamilyLookupUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteText, setInviteText] = useState<string | null>(null);

  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState<FamilyMemberGender>('prefer_not_to_say');

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyHousehold });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyRequests });
  }

  async function handleLookup() {
    setBusy(true);
    setMatched(null);
    setNotFound(false);
    setInviteText(null);
    try {
      const user = await familyConnectionService.lookupUser(lookup);
      if (user) {
        setMatched(user);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lookup failed';
      Alert.alert('Could not search', message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    if (!householdId || !matched) return;
    setBusy(true);
    try {
      const profile = await profileRepository.findByUserId(userId);
      await familyConnectionService.requestConnection({
        householdId,
        fromUserId: userId,
        fromName: profile?.fullName ?? 'A CareMate parent',
        emailOrPhone: lookup,
        matchedUser: matched,
      });
      Alert.alert('Request sent', 'Your spouse will see a connection request in CareMate.');
      setMatched(null);
      setLookup('');
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send request';
      Alert.alert('Connection failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite() {
    if (!householdId) return;
    setBusy(true);
    try {
      const profile = await profileRepository.findByUserId(userId);
      const { invite } = await familyConnectionService.requestConnection({
        householdId,
        fromUserId: userId,
        fromName: profile?.fullName ?? 'A CareMate parent',
        emailOrPhone: lookup,
        matchedUser: null,
      });
      if (invite) {
        setInviteText(invite.message);
      }
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create invite';
      Alert.alert('Invite failed', message);
    } finally {
      setBusy(false);
    }
  }

  async function handleShareInvite() {
    if (!inviteText) return;
    await Share.share({ message: inviteText });
  }

  async function handleAddChild() {
    if (!householdId) return;
    if (!childName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(childDob)) {
      Alert.alert('Missing details', 'Enter full name and date of birth as YYYY-MM-DD.');
      return;
    }
    setBusy(true);
    try {
      await familyRepository.addChild(householdId, {
        fullName: childName.trim(),
        dateOfBirth: childDob.trim(),
        gender: childGender,
      });
      setChildName('');
      setChildDob('');
      setChildGender('prefer_not_to_say');
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add child';
      Alert.alert('Add child failed', message);
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
              Family
            </AppText>
            <AppText variant="subtitle" style={styles.heroSubtitle}>
              Sign in to set up your family profile.
            </AppText>
          </LinearGradientFill>
        </View>
        <PressableScale
          style={[styles.primaryCta, shadow.soft]}
          onPress={() => router.push('/(auth)/login')}
        >
          <AppText variant="button" style={styles.primaryCtaLabel}>
            Sign in
          </AppText>
        </PressableScale>
      </View>
    );
  }

  if (householdQuery.isLoading) {
    return <LoadingState title="Loading family..." />;
  }

  if (!householdQuery.data) {
    return (
      <View style={styles.screen}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        >
          <AnimatedSection index={0}>
            <FamilyHero
              title="Start your household"
              subtitle="Set up your family, add kids, and connect your spouse. Each parent keeps their own CareMate data."
            />
          </AnimatedSection>
          <AnimatedSection index={1}>
            <PressableScale
              style={[styles.primaryCta, shadow.soft]}
              onPress={() => router.push('/(app)/family/setup')}
            >
              <UserPlus color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                Set up family
              </AppText>
            </PressableScale>
          </AnimatedSection>
          {(requestsQuery.data?.length ?? 0) > 0 ? (
            <AnimatedSection index={2}>
              <PressableScale
                style={styles.secondaryCta}
                onPress={() => router.push('/(app)/family/requests')}
              >
                <Link2 color={ACCENT} size={18} strokeWidth={2.25} />
                <AppText variant="button" style={styles.secondaryCtaLabel}>
                  View {requestsQuery.data!.length} connection request(s)
                </AppText>
              </PressableScale>
            </AnimatedSection>
          ) : null}
        </Animated.ScrollView>
      </View>
    );
  }

  const children = (membersQuery.data ?? []).filter((m) => m.kind === 'child');
  const adults = (membersQuery.data ?? []).filter((m) => m.kind !== 'child');
  const requestCount = requestsQuery.data?.length ?? 0;

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedSection index={0}>
          <FamilyHero
            title="Your family"
            subtitle="Kids are shared in this household. Each parent keeps their own account data."
            meta={`${adults.length} adult${adults.length === 1 ? '' : 's'} · ${children.length} child${children.length === 1 ? '' : 'ren'}`}
          />
        </AnimatedSection>

        {requestCount > 0 ? (
          <AnimatedSection index={1}>
            <View style={[styles.card, styles.requestCard, shadow.soft]}>
              <AppText variant="caption" style={styles.sectionEyebrow}>
                Connection requests
              </AppText>
              <AppText variant="body">
                You have {requestCount} pending spouse connection request
                {requestCount === 1 ? '' : 's'}.
              </AppText>
              <PressableScale
                style={styles.secondaryCta}
                onPress={() => router.push('/(app)/family/requests')}
              >
                <Link2 color={ACCENT} size={16} strokeWidth={2.25} />
                <AppText variant="button" style={styles.secondaryCtaLabel}>
                  Review requests
                </AppText>
              </PressableScale>
            </View>
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              Parents & spouse
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
                      {member.kind}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
            {adults.length === 0 ? (
              <AppText variant="caption" style={styles.muted}>
                No linked adults yet.
              </AppText>
            ) : null}
          </View>
        </AnimatedSection>

        <AnimatedSection index={3}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              Children
            </AppText>
            {children.map((child, index) => (
              <View key={child.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Baby color={ACCENT} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={styles.memberName}>
                      {child.fullName}
                    </AppText>
                    <AppText variant="caption" style={styles.muted}>
                      DOB {formatDob(child.dateOfBirth)} · {child.gender ?? '—'}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
            {children.length === 0 ? (
              <AppText variant="caption" style={styles.muted}>
                No children added yet.
              </AppText>
            ) : null}

            <AppText variant="caption" style={[styles.sectionEyebrow, { marginTop: spacing.sm }]}>
              Add another child
            </AppText>
            <Input placeholder="Full name" value={childName} onChangeText={setChildName} />
            <Input
              placeholder="Date of birth (YYYY-MM-DD)"
              value={childDob}
              onChangeText={setChildDob}
              autoCapitalize="none"
            />
            <View style={styles.chipRow}>
              {FAMILY_GENDERS.map((g) => {
                const selected = childGender === g.value;
                return (
                  <PressableScale
                    key={g.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setChildGender(g.value)}
                    scale={0.96}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : styles.chipText}
                    >
                      {g.label}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale
              style={[styles.primaryCta, busy ? styles.ctaDisabled : null, shadow.soft]}
              disabled={busy}
              onPress={() => void handleAddChild()}
            >
              <Baby color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {busy ? 'Saving...' : 'Add child'}
              </AppText>
            </PressableScale>
          </View>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              Connect spouse
            </AppText>
            <AppText variant="caption" style={styles.muted}>
              Enter their CareMate email or phone. We do not send invites automatically — if they
              are not found, you get a message to share.
            </AppText>
            <Input
              placeholder="Email or phone"
              autoCapitalize="none"
              keyboardType="email-address"
              value={lookup}
              onChangeText={setLookup}
            />
            <PressableScale
              style={[styles.secondaryCta, busy || !lookup.trim() ? styles.ctaDisabled : null]}
              disabled={busy || !lookup.trim()}
              onPress={() => void handleLookup()}
            >
              <AppText variant="button" style={styles.secondaryCtaLabel}>
                {busy ? 'Searching...' : 'Find'}
              </AppText>
            </PressableScale>

            {matched ? (
              <View style={styles.foundCard}>
                <AppText variant="cardTitle" style={{ color: TITLE }}>
                  {matched.fullName}
                </AppText>
                <AppText variant="caption">Email: {matched.email ?? '—'}</AppText>
                <AppText variant="caption">Phone: {matched.phone ?? '—'}</AppText>
                <AppText variant="caption">DOB: {formatDob(matched.dateOfBirth)}</AppText>
                <AppText variant="caption">
                  Location: {[matched.state, matched.countryCode].filter(Boolean).join(', ') || '—'}
                </AppText>
                <PressableScale
                  style={[styles.primaryCta, busy ? styles.ctaDisabled : null]}
                  disabled={busy}
                  onPress={() => void handleConnect()}
                >
                  <AppText variant="button" style={styles.primaryCtaLabel}>
                    Connect
                  </AppText>
                </PressableScale>
              </View>
            ) : null}

            {notFound ? (
              <View style={styles.foundCard}>
                <AppText variant="body">
                  We could not find a CareMate account with that email or phone.
                </AppText>
                <PressableScale
                  style={[styles.secondaryCta, busy ? styles.ctaDisabled : null]}
                  disabled={busy}
                  onPress={() => void handleInvite()}
                >
                  <Share2 color={ACCENT} size={16} strokeWidth={2.25} />
                  <AppText variant="button" style={styles.secondaryCtaLabel}>
                    Generate invite message
                  </AppText>
                </PressableScale>
              </View>
            ) : null}

            {inviteText ? (
              <View style={styles.foundCard}>
                <AppText variant="caption">{inviteText}</AppText>
                <PressableScale
                  style={styles.secondaryCta}
                  onPress={() => void handleShareInvite()}
                >
                  <Share2 color={ACCENT} size={16} strokeWidth={2.25} />
                  <AppText variant="button" style={styles.secondaryCtaLabel}>
                    Share invite
                  </AppText>
                </PressableScale>
              </View>
            ) : null}
          </View>
        </AnimatedSection>
      </Animated.ScrollView>
    </View>
  );
}

function FamilyHero({ title, subtitle, meta }: { title: string; subtitle: string; meta?: string }) {
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
          Family care
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
