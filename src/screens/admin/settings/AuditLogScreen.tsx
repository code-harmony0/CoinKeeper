/**
 * AuditLogScreen
 * Comprehensive audit log viewer with filters, search, and real-time updates
 * Reads from Firestore `auditLogs` collection
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import firestore from '@react-native-firebase/firestore';
import {
  ArrowLeft, Search, Filter, CheckCircle, XCircle,
  Clock, User, Shield, Zap, RefreshCw, ChevronDown,
} from 'lucide-react-native';
import { COLORS } from '../../../theme/colors';
import type { AuditLogEntry, AuditAction, AuditActorType } from '../../../types/payment';

const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };
const PAGE_SIZE = 20;

type FilterChip = 'all' | 'admin' | 'system' | 'scheduler' | 'success' | 'failed';

const FILTER_CHIPS: { label: string; value: FilterChip }[] = [
  { label: 'All', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'System', value: 'system' },
  { label: 'Scheduler', value: 'scheduler' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
];

const getActionIcon = (action: AuditAction) => {
  if (action.includes('payment') || action.includes('reconciliation')) return CheckCircle;
  if (action.includes('failed') || action.includes('mismatch')) return XCircle;
  if (action.includes('reminder') || action.includes('scheduled')) return Clock;
  if (action.includes('admin') || action.includes('override')) return Shield;
  return Zap;
};

const getActionColor = (action: AuditAction, success: boolean) => {
  if (!success) return '#D32F2F';
  if (action.includes('success') || action.includes('confirmed') || action.includes('matched')) return '#2E7D32';
  if (action.includes('failed') || action.includes('mismatch')) return '#D32F2F';
  if (action.includes('reminder') || action.includes('overdue')) return '#F57C00';
  return COLORS.primaryBlue;
};

const formatAction = (action: string): string => {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp?.toDate) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getActorIcon = (actorType: AuditActorType) => {
  switch (actorType) {
    case 'admin': return User;
    case 'system': return Zap;
    case 'scheduler': return Clock;
    case 'webhook': return RefreshCw;
    default: return User;
  }
};

interface Props {
  navigation: any;
}

export const AuditLogScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setLastDoc(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let query = firestore()
        .collection('auditLogs')
        .orderBy('timestamp', 'desc')
        .limit(PAGE_SIZE);

      // Apply filter
      if (activeFilter === 'admin' || activeFilter === 'system' || activeFilter === 'scheduler') {
        query = firestore()
          .collection('auditLogs')
          .where('actorType', '==', activeFilter)
          .orderBy('timestamp', 'desc')
          .limit(PAGE_SIZE);
      } else if (activeFilter === 'success') {
        query = firestore()
          .collection('auditLogs')
          .where('success', '==', true)
          .orderBy('timestamp', 'desc')
          .limit(PAGE_SIZE);
      } else if (activeFilter === 'failed') {
        query = firestore()
          .collection('auditLogs')
          .where('success', '==', false)
          .orderBy('timestamp', 'desc')
          .limit(PAGE_SIZE);
      }

      if (!reset && lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogEntry[];

      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
    } catch (error) {
      console.error('[AuditLog] Error loading logs:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeFilter, lastDoc]);

  useEffect(() => {
    loadLogs(true);
  }, [activeFilter]);

  const handleFilterChange = (filter: FilterChip) => {
    ReactNativeHapticFeedback.trigger('selection');
    setActiveFilter(filter);
    setExpandedId(null);
  };

  const handleRefresh = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    loadLogs(true);
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log =>
      log.action.toLowerCase().includes(q) ||
      log.actorName?.toLowerCase().includes(q) ||
      log.targetName?.toLowerCase().includes(q) ||
      log.targetCollection?.toLowerCase().includes(q) ||
      log.errorMessage?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const renderLogItem = useCallback(({ item, index }: { item: AuditLogEntry; index: number }) => {
    const IconComponent = getActionIcon(item.action);
    const color = getActionColor(item.action, item.success);
    const ActorIcon = getActorIcon(item.actorType);
    const isExpanded = expandedId === item.id;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 300)).springify(SPRING_CONFIG)}>
        <TouchableOpacity
          style={[styles.logCard, !item.success && styles.failedCard]}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('selection');
            setExpandedId(isExpanded ? null : item.id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.logHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
              <IconComponent size={18} color={color} />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logAction} numberOfLines={1}>
                {formatAction(item.action)}
              </Text>
              <View style={styles.logMeta}>
                <ActorIcon size={12} color="#999" />
                <Text style={styles.logActor}>
                  {item.actorName || item.actorType}
                </Text>
                <Text style={styles.logDot}>{'\u00B7'}</Text>
                <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: item.success ? '#2E7D32' : '#D32F2F' }]} />
          </View>

          {item.targetName && (
            <Text style={styles.logTarget} numberOfLines={1}>
              Target: {item.targetName} ({item.targetCollection})
            </Text>
          )}

          {!item.success && item.errorMessage && (
            <Text style={styles.logError} numberOfLines={isExpanded ? undefined : 1}>
              {item.errorMessage}
            </Text>
          )}

          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Actor ID</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{item.actorId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target ID</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{item.targetId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Collection</Text>
                <Text style={styles.detailValue}>{item.targetCollection}</Text>
              </View>
              {item.ipAddress && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IP Address</Text>
                  <Text style={styles.detailValue}>{item.ipAddress}</Text>
                </View>
              )}
              {item.payload && Object.keys(item.payload).length > 0 && (
                <View style={styles.payloadSection}>
                  <Text style={styles.detailLabel}>Payload</Text>
                  <Text style={styles.payloadText}>
                    {JSON.stringify(item.payload, null, 2).slice(0, 300)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.expandIndicator}>
            <ChevronDown
              size={14}
              color="#999"
              style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [expandedId]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Shield size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>No Audit Logs</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'No logs match your search' : 'No logs found for this filter'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify(SPRING_CONFIG)} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#121723" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Audit Log</Text>
          <Text style={styles.headerSubtitle}>{filteredLogs.length} entries</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(30).springify(SPRING_CONFIG)} style={styles.searchContainer}>
        <Search size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search actions, actors, targets..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Filter Chips */}
      <Animated.View entering={FadeInDown.delay(60).springify(SPRING_CONFIG)} style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTER_CHIPS}
          keyExtractor={item => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleFilterChange(item.value)}
              style={[styles.filterChip, activeFilter === item.value && styles.activeFilterChip]}
            >
              <Text style={[styles.filterChipText, activeFilter === item.value && styles.activeFilterChipText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </Animated.View>

      {/* Log List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={item => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          onEndReached={() => {
            if (hasMore && !isLoadingMore && !searchQuery) {
              loadLogs(false);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 16 }} color={COLORS.primaryBlue} />
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2DFF7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, height: 44,
    gap: 10, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#121723',
    padding: 0,
  },
  filterRow: { marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CCC',
  },
  activeFilterChip: { backgroundColor: '#121723', borderColor: '#121723' },
  filterChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: '#666' },
  activeFilterChipText: { color: '#FFFFFF' },
  logCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  failedCard: { borderLeftWidth: 3, borderLeftColor: '#D32F2F' },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  logInfo: { flex: 1 },
  logAction: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  logActor: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: '#999' },
  logDot: { fontSize: 11, color: '#999' },
  logTime: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: '#999' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  logTarget: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#666',
    marginTop: 8, paddingLeft: 48,
  },
  logError: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#D32F2F',
    marginTop: 6, paddingLeft: 48, lineHeight: 16,
  },
  expandedSection: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: '#999' },
  detailValue: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#121723', flex: 1, textAlign: 'right', marginLeft: 12 },
  payloadSection: { marginTop: 8 },
  payloadText: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', color: '#666',
    backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginTop: 4, lineHeight: 16,
  },
  expandIndicator: { alignItems: 'center', marginTop: 6 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 4 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: '#666', marginTop: 12 },
});

export default AuditLogScreen;
