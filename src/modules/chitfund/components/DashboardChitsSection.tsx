/**
 * DashboardChitsSection — the chits block of UserDashboardScreen.
 *
 * Lives inside src/modules/chitfund so Metro's blockList can drop it from the
 * lite bundle. It owns its own useChitFunds() call; the dashboard reaches it
 * only through a CHITFUND_ENABLED-guarded require().
 *
 * Styled like Home's Upcoming list (black icon tile, name, one quiet line, a
 * thin progress line) so chits read as part of the same app.
 */
import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Users } from 'lucide-react-native';
import { useChitFunds } from '../hooks/useChitFunds';
import { brand, useSpecTheme } from '../../../theme/specTheme';
import type { ChitGroup } from '../types/chitFund';
import { PressableScale } from '../../../components/anim';
import { HomeSection } from '../../../components/home/HomeSection';

type Props = {
  navigation: any;
  /** Incremented by the dashboard's pull-to-refresh; triggers a refetch. */
  refreshToken?: number;
};

const MAX_ROWS = 2;

const DashboardChitsSection: React.FC<Props> = ({ navigation, refreshToken = 0 }) => {
  const { groups, refreshGroups } = useChitFunds();

  useEffect(() => {
    if (refreshToken > 0) {
      refreshGroups();
    }
  }, [refreshToken, refreshGroups]);

  const navigateToGroups = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const extra = Math.max(groups.length - MAX_ROWS, 0);

  return (
    <HomeSection title={`Chits (${groups.length})`} onPress={navigateToGroups}>
      {groups.slice(0, MAX_ROWS).map((group, i) => (
        <ChitRow
          key={group.id}
          group={group}
          index={i}
          last={i === Math.min(groups.length, MAX_ROWS) - 1 && extra === 0}
          onPress={() => navigation.navigate('ChitDetail', { groupId: group.id })}
        />
      ))}
      {extra > 0 && (
        <PressableScale onPress={navigateToGroups} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>See all {groups.length} chits</Text>
          <ChevronRight size={18} color="#6B7280" strokeWidth={1.8} />
        </PressableScale>
      )}
    </HomeSection>
  );
};

const ChitRow: React.FC<{
  group: ChitGroup;
  index: number;
  last: boolean;
  onPress: () => void;
}> = ({ group, index, last, onPress }) => {
  const { colors, isDark } = useSpecTheme();
  const progress = group.totalCycles > 0 ? Math.min(group.currentCycle / group.totalCycles, 1) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 60).springify().damping(18)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${group.name}, ₹${group.amount.toLocaleString('en-IN')} a month, cycle ${group.currentCycle} of ${group.totalCycles}`}
        style={[
          styles.row,
          !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        ]}
      >
        <View style={[styles.icon, isDark && { backgroundColor: colors.chipBg }]}>
          <Users size={20} color="#FFFFFF" strokeWidth={1.7} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            ₹{group.amount.toLocaleString('en-IN')}/mo · cycle {group.currentCycle} of {group.totalCycles}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.textPrimary }]} />
          </View>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.7} />
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingVertical: 8 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill: { height: 4, borderRadius: 2 },
  more: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreText: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Bold', color: '#4B5563' },
});

export default DashboardChitsSection;
