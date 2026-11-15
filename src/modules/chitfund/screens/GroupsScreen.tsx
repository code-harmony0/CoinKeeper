/**
 * GroupsScreen — chit fund groups, in the app's v5 system: plain canvas,
 * a flat stats line, and rows that match Home's lists (black icon tile, name,
 * one quiet line, amount). Tapping a row opens the group.
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Plus, Users } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useGroups } from '../hooks/useGroups';
import { CreateGroupSheet } from '../../../components/modals/CreateGroupSheet';
import { useSecureScreen } from '../../../hooks/useSecureScreen';
import { brand, useSpecTheme } from '../../../theme/specTheme';
import { PressableScale } from '../../../components/anim';

type Props = NativeStackScreenProps<any, 'Groups'>;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const GroupsScreen: React.FC<Props> = ({ navigation }) => {
  useSecureScreen();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useSpecTheme();
  const { groups, createGroup } = useGroups();
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const tile = isDark ? colors.chipBg : brand.ink;
  const monthly = groups.reduce((s, g) => s + (g.contributionAmount || 0), 0);
  const openCreate = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setShowCreateSheet(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          Chit groups
        </Text>
        <PressableScale
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Create a chit group"
          style={[styles.addButton, { backgroundColor: isDark ? brand.signal : brand.ink }]}
        >
          <Plus size={22} strokeWidth={2.6} color={isDark ? brand.ink : brand.signal} />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 120 }}
      >
        <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active groups</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{groups.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>You pay each month</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{rupees(monthly)}</Text>
          </View>
        </Animated.View>

        {groups.length > 0 ? (
          <View style={[styles.list, { borderTopColor: colors.border }]}>
            {groups.map((group, i) => (
              <Animated.View key={group.id} entering={FadeInDown.delay(80 + i * 50).springify().damping(18)}>
                <PressableScale
                  onPress={() => navigation.navigate('ChitDetail', { groupId: group.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${group.name}, ${group.maxMembers} members, ${rupees(group.contributionAmount)} a month`}
                  style={[
                    styles.row,
                    i < groups.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[styles.tile, { backgroundColor: tile }]}>
                    <Users size={20} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {group.maxMembers} members · {group.maxMembers} months
                    </Text>
                  </View>
                  <View style={styles.amount}>
                    <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
                      {rupees(group.contributionAmount)}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>per month</Text>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2.2} />
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.empty}>
            <View style={[styles.tile, { backgroundColor: tile }]}>
              <Users size={20} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No groups yet</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Create your first chit group to track contributions and draws.
            </Text>
            <PressableScale
              onPress={openCreate}
              accessibilityRole="button"
              style={[styles.cta, { backgroundColor: brand.signal }]}
            >
              <Text style={styles.ctaText}>Create group</Text>
            </PressableScale>
          </Animated.View>
        )}
      </ScrollView>

      <CreateGroupSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSubmit={async (name, amount, members) => {
          await createGroup({
            name,
            contributionAmount: amount,
            maxMembers: members,
            cycleTime: 'monthly',
            autoDebit: false,
            startDate: new Date(),
          });
          setShowCreateSheet(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 28, lineHeight: 36, fontFamily: 'Satoshi-Black', letterSpacing: -0.4 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: 24, paddingBottom: 24 },
  stat: { flex: 1 },
  statLabel: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  statValue: { fontSize: 28, lineHeight: 36, fontFamily: 'Satoshi-Black', marginTop: 2 },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingVertical: 8 },
  tile: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  meta: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  amount: { alignItems: 'flex-end' },
  amountValue: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
  empty: { gap: 8, alignItems: 'flex-start', paddingTop: 8 },
  emptyTitle: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', marginTop: 8 },
  cta: { minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 8 },
  ctaText: { fontSize: 16, fontFamily: 'Satoshi-Bold', color: brand.ink },
});

export default GroupsScreen;
