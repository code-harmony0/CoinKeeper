/**
 * ChitDetailScreen
 * Detail view for a single chit group — summary, member list, payout timeline,
 * and a "Mark as Paid" action that raises a pending approval for the admin flow.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import auth from '@react-native-firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useSpecTheme } from '../../theme/specTheme';
import { useChitFunds } from '../../hooks/useChitFunds';
import { groupService } from '../../services/groupService';
import { PressableScale } from '../../components/anim/PressableScale';
import type { ChitGroup } from '../../types/chitFund';
import type { GroupMember, GroupDraw, ContributionStatus } from '../../types/group';

const AMBER = '#F59E0B'; // No amber token in specTheme — approved one-off per spec.

const fmt = (v: number) => `₹${Math.abs(Math.round(v || 0)).toLocaleString('en-IN')}`;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const statusLabel: Record<ContributionStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
  failed: 'Overdue',
};

export const ChitDetailScreen: React.FC<any> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const { groups } = useChitFunds();

  const { groupId, group: passedGroup } = route.params || {};

  const group: ChitGroup | undefined = useMemo(
    () => passedGroup || groups.find(g => g.id === groupId),
    [passedGroup, groups, groupId],
  );

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [draws, setDraws] = useState<GroupDraw[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    const unsubMembers = groupService.onMembersSnapshot(groupId, setMembers, err =>
      console.error('[ChitDetailScreen] members error:', err),
    );
    const unsubDraws = groupService.onDrawsSnapshot(groupId, setDraws, err =>
      console.error('[ChitDetailScreen] draws error:', err),
    );
    return () => {
      unsubMembers();
      unsubDraws();
    };
  }, [groupId]);

  const currentUser = auth().currentUser;
  const isMember = useMemo(
    () => !!currentUser && members.some(m => m.userId === currentUser.uid && m.status !== 'removed'),
    [currentUser, members],
  );

  // Draw tied to the current cycle (if any) identifies this month's receiver.
  const currentDraw = useMemo(
    () => (group ? draws.find(d => d.drawNumber === group.currentCycle) : undefined),
    [draws, group],
  );

  const sortedDraws = useMemo(
    () => [...draws].sort((a, b) => a.drawNumber - b.drawNumber),
    [draws],
  );

  const handleMarkAsPaid = useCallback(async () => {
    if (!group || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      const db = getFirestore();
      await addDoc(collection(db, 'pendingApprovals'), {
        userName: currentUser.displayName || 'Member',
        groupName: group.name,
        groupId: group.id,
        amount: group.amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Submitted', 'Your payment has been sent for admin confirmation.');
    } catch (error) {
      console.error('[ChitDetailScreen] Mark as paid error:', error);
      Alert.alert('Error', 'Could not submit your payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [group, currentUser, submitting]);

  const st = useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);

  if (!group) {
    return (
      <View style={[st.root, st.centered]}>
        <Text style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium' }}>
          Chit group not found.
        </Text>
      </View>
    );
  }

  // Total Pool: real accumulated pool amount from Firestore (totalPooled/potAmount).
  const totalPool = group.potAmount;
  // Next Payout: approximated — contribution amount × member count (no dedicated field exists).
  const nextPayout = group.amount * group.totalMembers;

  return (
    <View style={st.root}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={st.headerRow}>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              navigation.goBack();
            }}
            style={[st.backButton, { backgroundColor: colors.chipBg }]}
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Text style={st.headerTitle} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={[st.pill, { backgroundColor: `${colors.success}1F` }]}>
            <Text style={[st.pillText, { color: colors.success }]}>On track</Text>
          </View>
        </Animated.View>

        {/* Summary cards */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={st.summaryRow}>
          <View style={st.summaryCard}>
            <Text style={st.summaryLabel}>Total Pool</Text>
            <Text style={st.summaryValue} numberOfLines={1}>
              {fmt(totalPool)}
            </Text>
          </View>
          <View style={st.summaryCard}>
            <Text style={st.summaryLabel}>Next Payout</Text>
            <Text style={st.summaryValue} numberOfLines={1}>
              {fmt(nextPayout)}
            </Text>
          </View>
          <View style={st.summaryCard}>
            <Text style={st.summaryLabel}>Your Contribution</Text>
            <Text style={st.summaryValue} numberOfLines={1}>
              {fmt(group.amount)}
              <Text style={st.summaryUnit}>/mo</Text>
            </Text>
          </View>
        </Animated.View>

        {/* Members */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={st.card}>
          <Text style={st.cardTitle}>Members</Text>
          {members.length === 0 ? (
            <Text style={st.emptyText}>No members found for this group.</Text>
          ) : (
            members.map((m, i) => {
              const isReceiver = currentDraw?.winnerId === m.userId;
              return (
                <View
                  key={m.id}
                  style={[
                    st.memberRow,
                    i === members.length - 1 && { borderBottomWidth: 0 },
                    isReceiver && { borderWidth: 2, borderColor: colors.primaryAccent, borderRadius: 14 },
                  ]}
                >
                  <View style={[st.avatar, { backgroundColor: colors.chipBg }]}>
                    <Text style={st.avatarText}>{initials(m.userName)}</Text>
                  </View>
                  <Text style={st.memberName} numberOfLines={1}>
                    {m.userName}
                  </Text>
                  <StatusPill status={m.contributionStatus} colors={colors} />
                </View>
              );
            })
          )}
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={st.card}>
          <Text style={st.cardTitle}>Payout Timeline</Text>
          {sortedDraws.length > 0 ? (
            sortedDraws.map((d, i) => {
              const isPast = d.status === 'completed';
              return (
                <View key={d.id} style={st.timelineRow}>
                  <View style={st.timelineTrack}>
                    <View
                      style={[
                        st.timelineDot,
                        { backgroundColor: isPast ? colors.success : colors.chipBg },
                      ]}
                    />
                    {i < sortedDraws.length - 1 && (
                      <View style={[st.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                  <View style={st.timelineContent}>
                    {isPast ? (
                      <>
                        <Text style={st.timelineName}>{d.winnerName || 'Member'}</Text>
                        <Text style={st.timelineMeta}>
                          {fmt(d.prizeAmount)} ·{' '}
                          {d.completedDate?.toDate
                            ? d.completedDate.toDate().toLocaleDateString()
                            : '—'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={st.timelineName}>{d.winnerName || `Cycle ${d.drawNumber}`}</Text>
                        <Text style={st.timelineMetaUpcoming}>Upcoming</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            // No draws data available — fall back to a plain cycle count split at currentCycle.
            Array.from({ length: group.totalCycles }, (_, idx) => idx + 1).map(cycle => {
              const isPast = cycle < group.currentCycle;
              const isLast = cycle === group.totalCycles;
              return (
                <View key={cycle} style={st.timelineRow}>
                  <View style={st.timelineTrack}>
                    <View
                      style={[
                        st.timelineDot,
                        { backgroundColor: isPast ? colors.success : colors.chipBg },
                      ]}
                    />
                    {!isLast && <View style={[st.timelineLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={st.timelineContent}>
                    <Text style={st.timelineName}>Cycle {cycle}</Text>
                    <Text style={isPast ? st.timelineMeta : st.timelineMetaUpcoming}>
                      {isPast ? 'Completed' : 'Upcoming'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>

        {/* Mark as Paid */}
        {isMember && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <PressableScale
              haptic="none"
              onPress={handleMarkAsPaid}
              disabled={submitting}
              style={[st.payButton, { backgroundColor: colors.primaryAccent }]}
            >
              <Text style={st.payButtonText}>{submitting ? 'Submitting…' : 'Mark as Paid'}</Text>
            </PressableScale>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const StatusPill: React.FC<{ status: ContributionStatus; colors: any }> = ({ status, colors }) => {
  const bg =
    status === 'paid' ? `${colors.success}1F` : status === 'pending' ? `${AMBER}1F` : `${colors.danger}1F`;
  const text = status === 'paid' ? colors.success : status === 'pending' ? AMBER : colors.danger;

  return (
    <View style={[localStyles.statusPill, { backgroundColor: bg }]}>
      <Text style={[localStyles.statusPillText, { color: text }]}>{statusLabel[status]}</Text>
    </View>
  );
};

const localStyles = StyleSheet.create({
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontFamily: 'Satoshi-Bold' },
});

const makeStyles = (colors: any, cardRadius: number, cardShadow: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
    },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginLeft: 8 },
    pillText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 14,
      ...cardShadow,
    },
    summaryLabel: {
      fontSize: 11,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    summaryValue: { fontSize: 16, fontFamily: 'Satoshi-Black', color: colors.textPrimary },
    summaryUnit: { fontSize: 11, fontFamily: 'Satoshi-Regular', color: colors.textSecondary },
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 18,
      marginBottom: 20,
      ...cardShadow,
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginBottom: 14,
    },
    emptyText: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: colors.textSecondary },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.textSecondary },
    memberName: { flex: 1, fontSize: 14, fontFamily: 'Satoshi-Medium', color: colors.textPrimary },
    timelineRow: { flexDirection: 'row' },
    timelineTrack: { width: 24, alignItems: 'center' },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineLine: { width: 2, flex: 1, marginTop: 2, marginBottom: 2 },
    timelineContent: { flex: 1, paddingBottom: 18 },
    timelineName: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: colors.textPrimary },
    timelineMeta: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: colors.textSecondary, marginTop: 2 },
    timelineMetaUpcoming: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: colors.textSecondary, marginTop: 2 },
    payButton: {
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
  });

export default ChitDetailScreen;
