/**
 * GroupAnalyticsScreen
 * Per-group performance analytics with contribution trends and top contributors
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { VictoryLine, VictoryChart, VictoryTheme, VictoryAxis, VictoryBar } from 'victory-native';
import {
  ArrowLeft, TrendingUp, Users, DollarSign, AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useGroupAnalytics } from '../../../features/analytics/hooks/useAnalytics';
import { COLORS } from '../../../../../theme/colors';
import type { TimeRange } from '../../../features/analytics/types';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

interface Props {
  navigation: any;
  route: any;
}

export const GroupAnalyticsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const groupId = route?.params?.groupId || '';
  const groupName = route?.params?.groupName || 'Group';
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');

  const { analytics, contributionTrend, isLoading, error } = useGroupAnalytics(groupId, selectedRange);

  const chartData = useMemo(() => {
    if (!contributionTrend.length) return [];
    return contributionTrend.map((pt, i) => ({
      x: pt.label || `P${i + 1}`,
      y: pt.value,
    }));
  }, [contributionTrend]);

  if (isLoading && !analytics) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading group analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify().damping(16).stiffness(140).mass(1)} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#121723" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>Group Performance</Text>
          </View>
        </Animated.View>

        {/* Time Range Selector */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)} style={styles.rangeRow}>
          {TIME_RANGES.map(r => (
            <TouchableOpacity
              key={r.value}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                setSelectedRange(r.value);
              }}
              style={[styles.rangeChip, selectedRange === r.value && styles.activeRangeChip]}>
              <Text style={[styles.rangeChipText, selectedRange === r.value && styles.activeRangeChipText]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* KPI Grid */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)} style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E8F5E9' }]}>
              <DollarSign size={20} color="#2E7D32" />
            </View>
            <Text style={styles.kpiValue}>
              {analytics ? `₹${(analytics.totalContributions / 1000).toFixed(0)}K` : '₹0'}
            </Text>
            <Text style={styles.kpiLabel}>Total Contributions</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E3F2FD' }]}>
              <Users size={20} color={COLORS.primaryBlue} />
            </View>
            <Text style={styles.kpiValue}>{analytics?.memberCount || 0}</Text>
            <Text style={styles.kpiLabel}>Members</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FFF3E0' }]}>
              <TrendingUp size={20} color="#E65100" />
            </View>
            <Text style={styles.kpiValue}>
              {analytics ? `${(analytics.collectionRate * 100).toFixed(0)}%` : '0%'}
            </Text>
            <Text style={styles.kpiLabel}>Collection Rate</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FFEBEE' }]}>
              <AlertTriangle size={20} color={COLORS.errorCoral} />
            </View>
            <Text style={styles.kpiValue}>
              {analytics ? `${(analytics.delinquencyRate * 100).toFixed(1)}%` : '0%'}
            </Text>
            <Text style={styles.kpiLabel}>Delinquency</Text>
          </View>
        </Animated.View>

        {/* Error State */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={16} color={COLORS.errorCoral} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Contribution Trend Chart */}
        {chartData.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)} style={styles.chartCard}>
          <Text style={styles.chartTitle}>Contribution Trend</Text>
          <VictoryChart
            width={340}
            height={200}
            theme={VictoryTheme.material}
            padding={{ top: 16, bottom: 40, left: 60, right: 20 }}>
            <VictoryAxis
              style={{
                axis: { stroke: '#E0E0E0' },
                tickLabels: { fontSize: 11, fill: '#6B7280', fontWeight: '600' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: '#E0E0E0' },
                tickLabels: { fontSize: 11, fill: '#6B7280' },
                grid: { stroke: '#F5F5F5', strokeDasharray: '4' },
              }}
              tickFormat={(t: number) => `₹${t / 1000}k`}
            />
            <VictoryLine
              data={chartData}
              style={{ data: { stroke: '#121723', strokeWidth: 3 } }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        </Animated.View>
        )}

        {/* Top Contributors */}
        {analytics?.topContributors && analytics.topContributors.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
            <Text style={styles.sectionTitle}>Top Contributors</Text>
            {analytics.topContributors.map((contributor, i) => (
              <View key={contributor.memberId} style={styles.contributorRow}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>#{i + 1}</Text>
                </View>
                <View style={styles.contributorInfo}>
                  <Text style={styles.contributorName}>{contributor.memberName}</Text>
                  <Text style={styles.contributorMeta}>
                    {(contributor.onTimeRate * 100).toFixed(0)}% on-time
                  </Text>
                </View>
                <Text style={styles.contributorAmount}>
                  ₹{contributor.totalContributed.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Delinquent Members */}
        {analytics?.delinquentMembers && analytics.delinquentMembers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.errorCoral }]}>Overdue Members</Text>
            {analytics.delinquentMembers.map(member => (
              <View key={member.memberId} style={[styles.contributorRow, styles.delinquentRow]}>
                <View style={styles.contributorInfo}>
                  <Text style={styles.contributorName}>{member.memberName}</Text>
                  <Text style={[styles.contributorMeta, { color: COLORS.errorCoral }]}>
                    {member.daysOverdue} days overdue
                  </Text>
                </View>
                <Text style={[styles.contributorAmount, { color: COLORS.errorCoral }]}>
                  ₹{member.overdueAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2DFF7' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'Satoshi-Black', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: '#666' },
  rangeRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16,
  },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CCC',
  },
  activeRangeChip: { backgroundColor: '#121723', borderColor: '#121723' },
  rangeChipText: { fontSize: 12, fontFamily: 'Satoshi-Medium', color: '#666' },
  activeRangeChipText: { color: '#FFFFFF' },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginBottom: 20,
  },
  kpiCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  kpiValue: { fontSize: 22, fontFamily: 'Satoshi-Black', color: '#121723', marginBottom: 4 },
  kpiLabel: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: '#666' },
  chartCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  chartTitle: { fontSize: 16, fontFamily: 'Satoshi-Black', color: '#121723', marginBottom: 8 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Satoshi-Black', color: '#121723', marginBottom: 12 },
  contributorRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  delinquentRow: { borderLeftWidth: 3, borderLeftColor: COLORS.errorCoral },
  rank: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rankText: { fontSize: 13, fontFamily: 'Satoshi-Black', color: '#121723' },
  contributorInfo: { flex: 1 },
  contributorName: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: '#121723' },
  contributorMeta: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: '#999', marginTop: 2 },
  contributorAmount: { fontSize: 15, fontFamily: 'Satoshi-Black', color: '#121723' },
  loadingText: { fontSize: 15, fontFamily: 'Satoshi-Medium', color: '#666', marginTop: 12 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE',
    marginHorizontal: 20, borderRadius: 12, padding: 12, gap: 8, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: 'Satoshi-Medium', color: COLORS.errorCoral, flex: 1 },
});

export default GroupAnalyticsScreen;
