import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { FAMILY_GENDERS, familyConnectionService, familyRepository } from '@/domains/family';
import type { FamilyLookupUser, FamilyMemberGender } from '@/domains/family/types';
import { profileRepository } from '@/domains/profile/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

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
      <View style={[styles.screen, styles.padded]}>
        <AppText variant="sectionTitle">Family</AppText>
        <AppText variant="subtitle">Sign in to set up your family profile.</AppText>
        <Button label="Sign In" onPress={() => router.push('/(auth)/login')} />
      </View>
    );
  }

  if (householdQuery.isLoading) {
    return <LoadingState title="Loading family..." />;
  }

  if (!householdQuery.data) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AppText variant="sectionTitle">Family profile</AppText>
        <AppText variant="subtitle">
          Set up your household, add your kids, and connect your spouse. Each parent keeps their own
          CareMate data.
        </AppText>
        <Button label="Set up family" onPress={() => router.push('/(app)/family/setup')} />
        {(requestsQuery.data?.length ?? 0) > 0 ? (
          <Button
            label={`View ${requestsQuery.data!.length} connection request(s)`}
            variant="secondary"
            onPress={() => router.push('/(app)/family/requests')}
          />
        ) : null}
      </ScrollView>
    );
  }

  const children = (membersQuery.data ?? []).filter((m) => m.kind === 'child');
  const adults = (membersQuery.data ?? []).filter((m) => m.kind !== 'child');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="sectionTitle">Your family</AppText>
      <AppText variant="subtitle">
        Kids are shared in this household. Each parent keeps their own account data.
      </AppText>

      {(requestsQuery.data?.length ?? 0) > 0 ? (
        <View style={styles.card}>
          <AppText variant="cardTitle">Connection requests</AppText>
          <AppText variant="quickActionSubtitle">
            You have {requestsQuery.data!.length} pending spouse connection request(s).
          </AppText>
          <Button label="Review requests" onPress={() => router.push('/(app)/family/requests')} />
        </View>
      ) : null}

      <View style={styles.card}>
        <AppText variant="cardTitle">Parents & spouse</AppText>
        {adults.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <AppText variant="body">{member.fullName}</AppText>
            <AppText variant="caption" style={styles.muted}>
              {member.kind}
            </AppText>
          </View>
        ))}
        {adults.length === 0 ? (
          <AppText variant="caption" style={styles.muted}>
            No linked adults yet.
          </AppText>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Children</AppText>
        {children.map((child) => (
          <View key={child.id} style={styles.memberRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body">{child.fullName}</AppText>
              <AppText variant="caption" style={styles.muted}>
                DOB {formatDob(child.dateOfBirth)} · {child.gender ?? '—'}
              </AppText>
            </View>
          </View>
        ))}
        {children.length === 0 ? (
          <AppText variant="caption" style={styles.muted}>
            No children added yet.
          </AppText>
        ) : null}

        <AppText variant="body" style={styles.sectionLabel}>
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
              <Pressable
                key={g.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setChildGender(g.value)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {g.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Button label={busy ? 'Saving...' : 'Add child'} disabled={busy} onPress={handleAddChild} />
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Connect spouse</AppText>
        <AppText variant="quickActionSubtitle">
          Enter their CareMate email or phone. We do not send invites automatically — if they are
          not found, you get a message to share.
        </AppText>
        <Input
          placeholder="Email or phone"
          autoCapitalize="none"
          keyboardType="email-address"
          value={lookup}
          onChangeText={setLookup}
        />
        <Button
          label={busy ? 'Searching...' : 'Find'}
          disabled={busy || !lookup.trim()}
          onPress={handleLookup}
        />

        {matched ? (
          <View style={styles.foundCard}>
            <AppText variant="cardTitle">{matched.fullName}</AppText>
            <AppText variant="caption">Email: {matched.email ?? '—'}</AppText>
            <AppText variant="caption">Phone: {matched.phone ?? '—'}</AppText>
            <AppText variant="caption">DOB: {formatDob(matched.dateOfBirth)}</AppText>
            <AppText variant="caption">
              Location: {[matched.state, matched.countryCode].filter(Boolean).join(', ') || '—'}
            </AppText>
            <Button label="Connect" disabled={busy} onPress={handleConnect} />
          </View>
        ) : null}

        {notFound ? (
          <View style={styles.foundCard}>
            <AppText variant="body">
              We could not find a CareMate account with that email or phone.
            </AppText>
            <Button
              label="Generate invite message"
              variant="secondary"
              disabled={busy}
              onPress={handleInvite}
            />
          </View>
        ) : null}

        {inviteText ? (
          <View style={styles.foundCard}>
            <AppText variant="caption">{inviteText}</AppText>
            <Button label="Share invite" onPress={handleShareInvite} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  padded: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    justifyContent: 'center',
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  foundCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
    padding: spacing.md,
    gap: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  muted: {
    color: palette.textSecondary,
  },
  sectionLabel: {
    marginTop: spacing.sm,
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
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipTextSelected: {
    color: palette.primaryDark,
  },
});
