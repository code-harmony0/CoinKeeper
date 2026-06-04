/**
 * MemberAnalyticsScreen
 * Individual member performance, risk score, and payment behavior
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  ArrowLeft, Shield, TrendingUp, Clock, AlertTriangle,
  CheckCircle, XCircle, Users,
} from 'lucide-react-native';
import { useMemberAnalytics } from '../../../features/analytics/hooks/useAnalytics';
import { COLORS } from '../../../theme/colors';
import type { TimeRange } from '../../../features/analytics/types';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const getRiskColor = (score: number) => {
  if (score <= 25) return '#2E7D32';
  if (score <= 50) return '#F57C00';
  if (score <= 75) return '#E65100';
  return '#D32F2F';
};

const getRiskLabel = (score: number) => {
  if (score <= 25) return 'Low Risk';
  if (score <= 50) return 'Medium Risk';
  if (score <= 75) return 'High Risk';
  return 'Critical';
};

interface Props {
  navigation: any;
  route: any;
}

export const MemberAnalyticsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const memberId = route?.params?.memberId || '';
  const memberName = route?.params?.memberName || 'Member';
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');

  const { analytics, isLoading, error } = useMemberAnalytics(memberId, selectedRange);

  if (isLoading && !analytics) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading member analytics...</Text>
      </View>
    );
  }

  const riskScore = analytics?.riskScore || 0;
  const riskColor = getRiskColor(riskScore);
  const riskLabel = getRiskLabel(riskScore);

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
            <Text style={styles.headerTitle}>{memberName}</Text>
            <Text style={styles.headerSubtitle}>Member Analytics</Text>
          </View>
        </Animated.View>

        {/* Time Range Selector */}
        <Animated.View entering={FadeInDown.delay(30).springify().damping(16).stiffness(140).mass(1)} style={styles.rangeRow}>
          {(['week', 'month', 'quarter', 'year'] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => { ReactNativeHapticFeedback.trigger('selection'); setSelectedRange(r); }}
              style={[styles.rangeChip, selectedRange === r && styles.activeRangeChip]}>
              <Text style={[styles.rangeChipText, selectedRange === r && styles.activeRangeChipText]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Error State */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={16} color={COLORS.errorCoral} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Risk Score Card */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)} style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Shield size={24} color={riskColor} />
            <Text style={styles.riskTitle}>Risk Assessment</Text>
          </View>
          <View style={styles.riskScoreRow}>
            <View style={[styles.riskScoreCircle, { borderColor: riskColor }]}>
              <Text style={[styles.riskScoreValue, { color: riskColor }]}>{riskScore}</Text>
              <Text style={styles.riskScoreLabel}>/100</Text>
            </View>
            <View style={styles.riskDetails}>
              <Text style={[styles.riskCategory, { color: riskColor }]}>{riskLabel}</Text>
              <Text style={styles.riskChurn}>
                Churn probability: {((analytics?.churnProbability || 0) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
          {analytics?.riskFactors && analytics.riskFactors.length > 0 && (
            <View style={styles.riskFactors}>
              {analytics.riskFactors.map((factor, i) => (
                <View key={i} style={styles.factorRow}>
                  <AlertTriangle size={14} color={riskColor} />
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Payment Behavior */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Behavior</Text>
          <View style={styles.behaviorGrid}>
            <View style={styles.behaviorCard}>
              <CheckCircle size={20} color="#2E7D32" />
              <Text style={styles.behaviorValue}>{analytics?.onTimePayments || 0}</Text>
              <Text style={styles.behaviorLabel}>On Time</Text>
            </View>
            <View style={styles.behaviorCard}>
              <Clock size={20} color="#F57C00" />
              <Text style={styles.behaviorValue}>{analytics?.latePayments || 0}</Text>
              <Text style={styles.behaviorLabel}>Late</Text>
            </View>
            <View style={styles.behaviorCard}>
              <XCircle size={20} color="#D32F2F" />
              <Text style={styles.behaviorValue}>{analytics?.missedPayments || 0}</Text>
              <Text style={styles.behaviorLabel}>Missed</Text>
            </View>
          </View>
        </Animated.View>

        {/* Financial Summary */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.finCard}>
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Total Contributed</Text>
              <Text style={styles.finValue}>
                ₹{(analytics?.totalContributed || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Average Contribution</Text>
              <Text style={styles.finValue}>
                ₹{(analytics?.averageContribution || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>Total Received</Text>
              <Text style={styles.finValue}>
                ₹{(analytics?.totalReceived || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.finRow}>
              <Text style={styles.finLabel}>On-Time Rate</Text>
              <Text style={[styles.finValue, { color: getRiskColor(100 - (analytics?.onTimeRate || 0) * 100) }]}>
                {((analytics?.onTimeRate || 0) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Group Memberships */}
        {analytics?.groupMemberships && analytics.groupMemberships.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
            <Text style={styles.sectionTitle}>Group Memberships</Text>
            {analytics.groupMemberships.map(group => (
              <View key={group.groupId} style={styles.groupRow}>
                <Users size={18} color={COLORS.primaryBlue} />
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.groupName}</Text>
                  <Text style={styles.groupMeta}>
                    ₹{group.contributionAmount.toLocaleString('en-IN')}/cycle
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: group.status === 'active' ? '#E8F5E9' : '#FFF3E0' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: group.status === 'active' ? '#2E7D32' : '#E65100' },
                  ]}>
                    {group.status}
                  </Text>
                </View>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  riskCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  riskTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  riskScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  riskScoreCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  riskScoreValue: { fontSize: 28, fontFamily: 'PlusJakartaSans-Bold' },
  riskScoreLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999' },
  riskDetails: { flex: 1 },
  riskCategory: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 4 },
  riskChurn: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  riskFactors: { marginTop: 16, gap: 8 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666', flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginBottom: 12 },
  behaviorGrid: { flexDirection: 'row', gap: 12 },
  behaviorCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  behaviorValue: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginTop: 8 },
  behaviorLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#999', marginTop: 4 },
  finCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  finLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  finValue: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  groupMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', textTransform: 'capitalize' },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: '#666', marginTop: 12 },
  rangeRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CCC',
  },
  activeRangeChip: { backgroundColor: '#121723', borderColor: '#121723' },
  rangeChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: '#666' },
  activeRangeChipText: { color: '#FFFFFF' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE',
    marginHorizontal: 20, borderRadius: 12, padding: 12, gap: 8, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: COLORS.errorCoral, flex: 1 },
});

export default MemberAnalyticsScreen;
