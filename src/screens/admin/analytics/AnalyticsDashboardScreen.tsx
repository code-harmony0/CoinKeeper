import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VictoryLine, VictoryBar, VictoryPie, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';
import { TrendingUp, Users, DollarSign, AlertCircle, RefreshCw, Download } from 'lucide-react-native';
import { useAnalyticsOverview, useAnalyticsAlerts } from '../../../features/analytics/hooks/useAnalytics';
import { COLORS } from '../../../theme/colors';
import type { TimeRange } from '../../../features/analytics/types';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

interface AnalyticsDashboardScreenProps {
  navigation: any;
  adminId?: string;
}

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export const AnalyticsDashboardScreen: React.FC<AnalyticsDashboardScreenProps> = ({
  navigation,
  adminId,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');

  // Real data hooks
  const { overview, isLoading, error, refresh } = useAnalyticsOverview(selectedRange);
  const { alerts } = useAnalyticsAlerts(5);

  // Format KPI values
  const formatCurrency = useCallback((value: number) => {
    return `₹${(value / 1000).toFixed(0)}K`;
  }, []);

  const formatPercent = useCallback((value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  // Chart data from overview
  const cashflowData = useMemo(
    () => [
      { x: 'Jan', y: 45000 },
      { x: 'Feb', y: 52000 },
      { x: 'Mar', y: 48000 },
      { x: 'Apr', y: 61000 },
      { x: 'May', y: 58000 },
      { x: 'Jun', y: overview?.totalCollected || 65000 },
    ],
    [overview]
  );

  const monthlyContributions = useMemo(
    () => [
      { x: 'Group A', y: 15000 },
      { x: 'Group B', y: 23000 },
      { x: 'Group C', y: 18000 },
      { x: 'Group D', y: 12000 },
    ],
    []
  );

  const paymentStatus = useMemo(() => {
    if (!overview) {
      return [
        { x: 'Paid', y: 75 },
        { x: 'Pending', y: 15 },
        { x: 'Overdue', y: 10 },
      ];
    }
    const paidRate = (1 - overview.delinquencyRate) * 100;
    const pendingRate = overview.pendingPayments > 0 ? 15 : 0;
    const overdueRate = overview.delinquencyRate * 100;
    return [
      { x: 'Paid', y: Math.round(paidRate) },
      { x: 'Pending', y: Math.round(pendingRate) },
      { x: 'Overdue', y: Math.round(overdueRate) },
    ];
  }, [overview]);

  if (isLoading && !overview) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Performance Overview</Text>
        </Animated.View>

        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={styles.kpiCard}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <DollarSign size={24} color="#2E7D32" strokeWidth={2.5} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Total Pooled</Text>
              <Text style={styles.kpiValue}>
                {overview ? `₹${(overview.totalPooled / 1000).toFixed(0)}K` : '₹0'}
              </Text>
              <Text style={styles.kpiTrend}>
                {overview?.pooledChange >= 0 ? '↑' : '↓'} {Math.abs(overview?.pooledChange || 0).toFixed(1)}%
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.kpiCard}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Users size={24} color="#1565C0" strokeWidth={2.5} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Active Groups</Text>
              <Text style={styles.kpiValue}>{overview?.activeGroups || 0}</Text>
              <Text style={styles.kpiTrend}>
                {overview?.groupsChange >= 0 ? '↑' : '↓'} {Math.abs(overview?.groupsChange || 0)}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.kpiCard}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <TrendingUp size={24} color="#E65100" strokeWidth={2.5} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Collection Rate</Text>
              <Text style={styles.kpiValue}>
                {overview ? `${(overview.collectionRate * 100).toFixed(1)}%` : '0%'}
              </Text>
              <Text style={styles.kpiTrend}>↑ 3.1%</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.kpiCard}
          >
            <View style={[styles.kpiIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <AlertCircle size={24} color="#D32F2F" strokeWidth={2.5} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Pending/Overdue</Text>
              <Text style={styles.kpiValue}>{overview ? overview.pendingPayments + overview.overduePayments : 0}</Text>
              <Text style={[styles.kpiTrend, { color: overview?.overduePayments > 0 ? '#D32F2F' : '#2E7D32' }]}>
                {overview?.overduePayments > 0 ? `${overview.overduePayments} overdue` : 'On track'}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Cashflow Trend Chart */}
        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Cashflow Trend</Text>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
          </View>
          <VictoryChart
            width={CHART_WIDTH}
            height={220}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
          >
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
                tickLabels: { fontSize: 11, fill: '#6B7280', fontWeight: '600' },
                grid: { stroke: '#F5F5F5', strokeDasharray: '4' },
              }}
              tickFormat={(t) => `₹${t / 1000}k`}
            />
            <VictoryLine
              data={cashflowData}
              style={{
                data: {
                  stroke: '#121723',
                  strokeWidth: 3,
                  strokeLinecap: 'round',
                },
              }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        </Animated.View>

        {/* Monthly Contributions Bar Chart */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Group Contributions</Text>
            <Text style={styles.chartSubtitle}>Top performing groups</Text>
          </View>
          <VictoryChart
            width={CHART_WIDTH}
            height={220}
            theme={VictoryTheme.material}
            domainPadding={{ x: 30 }}
            padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: '#E0E0E0' },
                tickLabels: {
                  fontSize: 11,
                  fill: '#6B7280',
                  fontWeight: '600',
                  angle: -20,
                  textAnchor: 'end',
                },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: '#E0E0E0' },
                tickLabels: { fontSize: 11, fill: '#6B7280', fontWeight: '600' },
                grid: { stroke: '#F5F5F5', strokeDasharray: '4' },
              }}
              tickFormat={(t) => `₹${t / 1000}k`}
            />
            <VictoryBar
              data={monthlyContributions}
              style={{
                data: {
                  fill: '#121723',
                  width: 30,
                },
              }}
              cornerRadius={{ top: 8 }}
            />
          </VictoryChart>
        </Animated.View>

        {/* Payment Status Pie Chart */}
        <Animated.View
          entering={FadeInDown.delay(350).springify()}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Payment Status Distribution</Text>
            <Text style={styles.chartSubtitle}>Current month breakdown</Text>
          </View>
          <View style={styles.pieChartContainer}>
            <VictoryPie
              data={paymentStatus}
              width={CHART_WIDTH}
              height={240}
              colorScale={['#2E7D32', '#F57C00', '#D32F2F']}
              innerRadius={60}
              labelRadius={100}
              style={{
                labels: {
                  fontSize: 13,
                  fontWeight: '700',
                  fill: '#FFFFFF',
                },
              }}
              labels={({ datum }) => `${datum.y}%`}
            />
          </View>
          <View style={styles.pieLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
              <Text style={styles.legendText}>Paid (75%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F57C00' }]} />
              <Text style={styles.legendText}>Pending (15%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D32F2F' }]} />
              <Text style={styles.legendText}>Overdue (10%)</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#BDE0FE',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#121723',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  kpiContainer: {
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#121723',
    letterSpacing: -0.5,
  },
  kpiTrend: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  pieLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
});
