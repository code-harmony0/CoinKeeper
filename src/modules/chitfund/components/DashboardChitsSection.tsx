/**
 * DashboardChitsSection — the chits block of UserDashboardScreen.
 *
 * Lives inside src/modules/chitfund so Metro's blockList can drop it from the
 * lite bundle. It owns its own useChitFunds() call; the dashboard reaches it
 * only through a CHITFUND_ENABLED-guarded require().
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useChitFunds } from '../hooks/useChitFunds';
import { useSpecTheme } from '../../../theme/specTheme';
import type { ChitGroup } from '../types/chitFund';
import { PressableScale } from '../../../components/anim';
import { PastelCard } from '../../../components/premium';

const CHIT_TINTS = ['lavender', 'mint', 'peach'] as const;

type Props = {
  navigation: any;
  /** Incremented by the dashboard's pull-to-refresh; triggers a refetch. */
  refreshToken?: number;
};

const DashboardChitsSection: React.FC<Props> = ({ navigation, refreshToken = 0 }) => {
  const { colors } = useSpecTheme();
  const { groups, refreshGroups } = useChitFunds();

  useEffect(() => {
    if (refreshToken > 0) {
      refreshGroups();
    }
  }, [refreshToken, refreshGroups]);

  const navigateToGroups = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const visibleGroups = groups.slice(0, 2);
  const extraGroupCount = Math.max(groups.length - 2, 0);

  const st = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={st.section}>
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>Chits ({groups.length} active)</Text>
        <PressableScale onPress={navigateToGroups}>
          <Text style={st.linkText}>View All</Text>
        </PressableScale>
      </View>

      {visibleGroups.map((group, i) => (
        <ChitCard
          key={group.id}
          group={group}
          delay={80 + i * 40}
          tint={CHIT_TINTS[i % 3]}
          colors={colors}
          onPress={() => navigation.navigate('ChitDetail', { groupId: group.id })}
        />
      ))}

      {extraGroupCount > 0 && (
        <PressableScale onPress={navigateToGroups} style={st.moreLink}>
          <Text style={st.moreLinkText}>+{extraGroupCount} more groups</Text>
        </PressableScale>
      )}
    </View>
  );
};

/* ── Chit Card ── */
const ChitCard: React.FC<{
  group: ChitGroup;
  delay: number;
  tint: (typeof CHIT_TINTS)[number];
  colors: any;
  onPress: () => void;
}> = ({ group, delay, tint, colors, onPress }) => {
  const progress = group.totalCycles > 0 ? Math.min(group.currentCycle / group.totalCycles, 1) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.chitCardWrap}>
      {/* Plain View boundary so PressableScale's internal transform-animated
          node is not the direct child of this entering-animated wrapper —
          avoids the "transform may be overwritten by a layout animation" warning. */}
      <View>
        <PastelCard
          tint={tint}
          eyebrow={group.name}
          value={`₹${group.amount.toLocaleString('en-IN')}/mo`}
          caption={`${group.currentCycle}/${group.totalCycles} cycles`}
          progress={progress}
          onPress={onPress}
        >
          <View style={styles.chitStatusRow}>
            <View style={[styles.chitBadge, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
              <Text style={[styles.chitBadgeText, { color: colors[`${tint}Deep`] }]}>On track</Text>
            </View>
          </View>
        </PastelCard>
      </View>
    </Animated.View>
  );
};

/* ── Styles ── */
const styles = StyleSheet.create({
  chitCardWrap: {},
  chitStatusRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  chitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chitBadgeText: { fontSize: 11, fontFamily: 'Satoshi-Bold' },
});

const makeStyles = (colors: any) =>
  StyleSheet.create({
    section: {},
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    sectionTitle: { fontSize: 17, fontFamily: 'Satoshi-Bold', color: colors.textPrimary },
    linkText: { fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.lavenderDeep },
    moreLink: { alignSelf: 'center', paddingVertical: 8 },
    moreLinkText: { fontSize: 13, fontFamily: 'Satoshi-Medium', color: colors.textSecondary },
  });

export default DashboardChitsSection;
