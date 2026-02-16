/**
 * SystemHealthScreen
 * System monitoring: job status, data freshness, recent failures
 */
import React from 'react';
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
  ArrowLeft, Activity, CheckCircle, AlertTriangle, XCircle,
  Clock, Database, RefreshCw, Zap,
} from 'lucide-react-native';
import { useAnalyticsHealth } from '../../../features/analytics/hooks/useAnalytics';
import { COLORS } from '../../../theme/colors';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

const getFreshnessColor = (freshness: string) => {
  switch (freshness) {
    case 'fresh': return '#2E7D32';
    case 'stale': return '#F57C00';
    case 'critical': return '#D32F2F';
    default: return '#999';
  }
};

interface Props {
  navigation: any;
}

export const SystemHealthScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { health, isLoading, triggerRecompute } = useAnalyticsHealth();

  const handleRecompute = async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      const today = new Date().toISOString().split('T')[0];
      await triggerRecompute(today, today);
    } catch (err) {
      console.error('[SystemHealth] Recompute failed:', err);
    }
  };

  if (isLoading && !health) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading system health...</Text>
      </View>
    );
  }

  const freshness = health?.dataFreshness || 'fresh';
  const freshnessColor = getFreshnessColor(freshness);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify(SPRING_CONFIG)} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#121723" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>System Health</Text>
            <Text style={styles.headerSubtitle}>Infrastructure monitoring</Text>
          </View>
          <TouchableOpacity onPress={handleRecompute} style={styles.refreshButton}>
            <RefreshCw size={18} color={COLORS.primaryBlue} />
          </TouchableOpacity>
        </Animated.View>

        {/* Overall Status */}
        <Animated.View entering={FadeInDown.delay(50).springify(SPRING_CONFIG)} style={styles.statusCard}>
          <View style={[styles.statusIndicator, { backgroundColor: freshnessColor }]}>
            <Activity size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.statusTitle}>System Status</Text>
          <Text style={[styles.statusValue, { color: freshnessColor }]}>
            {freshness === 'fresh' ? 'All Systems Operational' :
             freshness === 'stale' ? 'Data Slightly Stale' : 'Needs Attention'}
          </Text>
          <Text style={styles.statusMeta}>
            Aggregation lag: {health?.aggregationLag || 0} min
          </Text>
        </Animated.View>

        {/* Job Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify(SPRING_CONFIG)} style={styles.section}>
          <Text style={styles.sectionTitle}>Job Status</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Zap size={20} color="#2E7D32" />
              <Text style={styles.statValue}>{health?.completedJobsToday || 0}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={20} color="#F57C00" />
              <Text style={styles.statValue}>{health?.pendingJobs || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <XCircle size={20} color="#D32F2F" />
              <Text style={styles.statValue}>{health?.failedJobs || 0}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </Animated.View>

        {/* Data Health */}
        <Animated.View entering={FadeInDown.delay(150).springify(SPRING_CONFIG)} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Health</Text>
          <View style={styles.dataCard}>
            <View style={styles.dataRow}>
              <Database size={18} color="#121723" />
              <Text style={styles.dataLabel}>Total Documents</Text>
              <Text style={styles.dataValue}>{health?.totalDocuments?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <AlertTriangle size={18} color="#F57C00" />
              <Text style={styles.dataLabel}>Stale Documents</Text>
              <Text style={styles.dataValue}>{health?.staleDocuments || 0}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <CheckCircle size={18} color={freshnessColor} />
              <Text style={styles.dataLabel}>Freshness</Text>
              <View style={[styles.freshnessBadge, { backgroundColor: `${freshnessColor}20` }]}>
                <Text style={[styles.freshnessText, { color: freshnessColor }]}>
                  {freshness}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Recent Failures */}
        {health?.recentFailures && health.recentFailures.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify(SPRING_CONFIG)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.errorCoral }]}>Recent Failures</Text>
            {health.recentFailures.map((failure, i) => (
              <View key={failure.jobId || i} style={styles.failureCard}>
                <View style={styles.failureHeader}>
                  <XCircle size={16} color="#D32F2F" />
                  <Text style={styles.failureType}>{failure.jobType}</Text>
                  <Text style={styles.failureTime}>
                    {failure.timestamp?.toDate?.().toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    }) || ''}
                  </Text>
                </View>
                <Text style={styles.failureError} numberOfLines={2}>
                  {failure.error}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  refreshButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  statusCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 20, padding: 24,
    marginBottom: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  statusIndicator: {
    width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statusTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#666', marginBottom: 4 },
  statusValue: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 6 },
  statusMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginTop: 8 },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#999', marginTop: 4, textAlign: 'center' },
  dataCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  dataLabel: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
  dataValue: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  freshnessBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freshnessText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', textTransform: 'capitalize' },
  failureCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#D32F2F',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  failureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  failureType: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  failureTime: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: '#999' },
  failureError: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#D32F2F', lineHeight: 16 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: '#666', marginTop: 12 },
});

export default SystemHealthScreen;
