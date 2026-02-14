/**
 * GroupsScreen - Premium Blob Design
 * Chit fund groups with organic cards
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChitFunds } from '../../hooks/useChitFunds';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_TYPOGRAPHY, THEME_ANIMATION } from '../../theme/blobTheme';
import { CreateGroupSheet } from '../../components/modals/CreateGroupSheet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<any, 'Groups'>;

export const GroupsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { groups, createGroup } = useChitFunds();
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#C2DFF7', '#D4E8F8', '#E8F2FC']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Chit Groups</Text>
        <Pressable
          onPress={() => { ReactNativeHapticFeedback.trigger('impactMedium'); setShowCreateSheet(true); }}
          style={styles.addButton}
        >
          <PlusIcon />
        </Pressable>
      </View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.statsRow}>
        <View style={styles.statBlob}>
          <Text style={styles.statValue}>{groups.length}</Text>
          <Text style={styles.statLabel}>Active Groups</Text>
        </View>
        <View style={styles.statBlob}>
          <Text style={styles.statValue}>₹{groups.reduce((s, g) => s + g.monthlyAmount, 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Monthly Total</Text>
        </View>
      </Animated.View>

      {/* Groups list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
      >
        {groups.length > 0 ? (
          groups.map((group, index) => (
            <Animated.View key={group.id} entering={FadeInDown.delay(100 + index * 50)}>
              <GroupCard
                name={group.name}
                members={group.totalMembers}
                amount={group.amount}
                duration={group.duration}
                color={getGroupColor(index)}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeInDown.delay(100)}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><UsersIcon /></View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create your first chit fund group</Text>
              <Pressable onPress={() => setShowCreateSheet(true)} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Create Group</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <CreateGroupSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSubmit={(name, amount, members, duration) => { createGroup(name, amount, members, duration); setShowCreateSheet(false); }}
      />
    </View>
  );
};

// Group card component
const GroupCard: React.FC<{ name: string; members: number; amount: number; duration: number; color: string }> = ({ name, members, amount, duration, color }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME_ANIMATION.spring) }] }));

  return (
    <Pressable onPressIn={() => { scale.value = 0.97; }} onPressOut={() => { scale.value = 1; }}>
      <Animated.View style={[styles.groupCard, animStyle]}>
        <View style={[styles.groupIcon, { backgroundColor: color }]}><UsersIcon /></View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{name}</Text>
          <Text style={styles.groupMeta}>{members} members • {duration} months</Text>
        </View>
        <View style={styles.groupAmount}>
          <Text style={styles.amountValue}>₹{amount.toLocaleString('en-IN')}</Text>
          <Text style={styles.amountLabel}>/month</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Icons
const PlusIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#FFF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const UsersIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={7} r={3} stroke={THEME_COLORS.textPrimary} strokeWidth={1.5} fill="none" />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={THEME_COLORS.textPrimary} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    <Circle cx={17} cy={7} r={3} stroke={THEME_COLORS.textPrimary} strokeWidth={1.5} fill="none" />
    <Path d="M21 21v-2a4 4 0 00-3-3.87" stroke={THEME_COLORS.textPrimary} strokeWidth={1.5} strokeLinecap="round" fill="none" />
  </Svg>
);

const getGroupColor = (i: number) => [THEME_COLORS.mint, THEME_COLORS.lavender, THEME_COLORS.peach, THEME_COLORS.backgroundGradientEnd][i % 4];

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { ...THEME_TYPOGRAPHY.h2, color: THEME_COLORS.textPrimary },
  addButton: { width: 48, height: 48, borderRadius: 18, backgroundColor: THEME_COLORS.accent, justifyContent: 'center', alignItems: 'center', ...THEME_SHADOWS.elevated },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statBlob: { flex: 1, backgroundColor: THEME_COLORS.surfaceTint, borderRadius: THEME_RADIUS.xl, padding: 16, alignItems: 'center', ...THEME_SHADOWS.card },
  statValue: { ...THEME_TYPOGRAPHY.h3, color: THEME_COLORS.textPrimary, marginBottom: 4 },
  statLabel: { ...THEME_TYPOGRAPHY.bodySmall, color: THEME_COLORS.textSecondary },
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME_COLORS.surfaceTint, borderRadius: THEME_RADIUS.xl, padding: 16, marginBottom: 12, ...THEME_SHADOWS.elevated },
  groupIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  groupInfo: { flex: 1 },
  groupName: { ...THEME_TYPOGRAPHY.body, color: THEME_COLORS.textPrimary },
  groupMeta: { ...THEME_TYPOGRAPHY.bodySmall, color: THEME_COLORS.textSecondary, marginTop: 4 },
  groupAmount: { alignItems: 'flex-end' },
  amountValue: { ...THEME_TYPOGRAPHY.body, color: THEME_COLORS.accent },
  amountLabel: { ...THEME_TYPOGRAPHY.bodySmall, color: THEME_COLORS.textSecondary },
  emptyCard: { backgroundColor: THEME_COLORS.surfaceTint, borderRadius: THEME_RADIUS.xxl, padding: 32, alignItems: 'center', ...THEME_SHADOWS.elevated },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: THEME_COLORS.surfaceTint, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { ...THEME_TYPOGRAPHY.h3, color: THEME_COLORS.textPrimary, marginBottom: 8 },
  emptyText: { ...THEME_TYPOGRAPHY.bodySmall, color: THEME_COLORS.textSecondary, marginBottom: 20 },
  emptyButton: { backgroundColor: THEME_COLORS.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: THEME_RADIUS.xl },
  emptyButtonText: { ...THEME_TYPOGRAPHY.label, color: THEME_COLORS.surface },
});

export default GroupsScreen;
