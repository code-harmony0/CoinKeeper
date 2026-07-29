/**
 * AdminNotificationsScreen
 * Admin notification inbox with filtering by type:
 * payment_submitted, payment_confirmed, payment_overdue, draw_completed, dispute_raised
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  Bell, CheckCircle, AlertTriangle, Trophy, Clock,
  FileWarning, CircleDot, Filter,
} from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../../../../theme/colors';
import { useTabBarScroll } from '../../../../../context/TabBarScrollContext';
import type { AdminNotificationType } from '../../../types/payment';

// SPRING_CONFIG replaced by chained methods

type FilterType = 'all' | AdminNotificationType;

interface AdminNotification {
  id: string;
  type: AdminNotificationType | string;
  title: string;
  message: string;
  groupId?: string;
  groupName?: string;
  memberId?: string;
  memberName?: string;
  read: boolean;
  createdAt: any;
  metadata?: Record<string, unknown>;
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'payment_submitted', label: 'Submitted' },
  { key: 'payment_confirmed', label: 'Confirmed' },
  { key: 'payment_overdue', label: 'Overdue' },
  { key: 'draw_completed', label: 'Draws' },
  { key: 'dispute_raised', label: 'Disputes' },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'payment_submitted': return { icon: Clock, color: COLORS.primaryBlue, bg: '#E3F2FD' };
    case 'payment_confirmed': return { icon: CheckCircle, color: COLORS.successGreen, bg: '#E8F5E9' };
    case 'payment_overdue': return { icon: AlertTriangle, color: COLORS.errorCoral, bg: '#FFEBEE' };
    case 'draw_completed': return { icon: Trophy, color: COLORS.warningAmber, bg: '#FFF8E1' };
    case 'dispute_raised': return { icon: FileWarning, color: '#E65100', bg: '#FFF3E0' };
    default: return { icon: Bell, color: COLORS.textSecondary, bg: '#F5F5F5' };
  }
};

const FilterChip: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    onPress={() => {
      ReactNativeHapticFeedback.trigger('selection');
      onPress();
    }}
    style={[styles.filterChip, isActive && styles.activeFilterChip]}>
    <Text style={[styles.filterChipText, isActive && styles.activeFilterChipText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const NotificationCard: React.FC<{
  notification: AdminNotification;
  index: number;
  onPress: () => void;
}> = ({ notification, index, onPress }) => {
  const { icon: IconComponent, color, bg } = getNotificationIcon(notification.type);
  const createdAt = notification.createdAt?.toDate?.();
  const timeAgo = createdAt ? getTimeAgo(createdAt) : '';

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify().damping(16).stiffness(140).mass(1)}>
      <TouchableOpacity
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactLight');
          onPress();
        }}
        style={[styles.notificationCard, !notification.read && styles.unreadCard]}>
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <IconComponent size={22} color={color} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          {notification.groupName && (
            <Text style={styles.groupTag}>{notification.groupName}</Text>
          )}
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export const AdminNotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const [filter, setFilter] = useState<FilterType>('all');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Real-time listener for admin notifications
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = firestore()
      .collection('adminNotifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as AdminNotification[];
          setNotifications(data);
          setIsLoading(false);
          setIsRefreshing(false);
        },
        err => {
          console.error('[AdminNotifications] Error:', err);
          setIsLoading(false);
          setIsRefreshing(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleNotificationPress = useCallback((notification: AdminNotification) => {
    // Mark as read
    firestore().collection('adminNotifications').doc(notification.id).update({ read: true });

    // Navigate based on type
    switch (notification.type) {
      case 'payment_submitted':
      case 'payment_confirmed':
      case 'dispute_raised':
        navigation.navigate('PaymentConfirmations');
        break;
      case 'payment_overdue':
        navigation.navigate('Collections', { screen: 'OverduePayments' });
        break;
      case 'draw_completed':
        if (notification.metadata?.drawId) {
          navigation.navigate('Draws', { screen: 'DrawDetails', params: { drawId: notification.metadata.drawId } });
        }
        break;
    }
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      const unread = notifications.filter(n => !n.read);
      const batch = firestore().batch();
      unread.forEach(n => {
        batch.update(firestore().collection('adminNotifications').doc(n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('[AdminNotifications] Mark all read failed:', err);
    }
  }, [notifications]);

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(0).springify().damping(16).stiffness(140).mass(1)}
        style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
              <CheckCircle size={16} color={COLORS.primaryBlue} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Filter Chips */}
      <Animated.View
        entering={FadeInDown.delay(50).springify().damping(16).stiffness(140).mass(1)}
        style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          renderItem={({ item }) => (
            <FilterChip
              label={item.label}
              isActive={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
          )}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        />
      </Animated.View>

      {/* Notifications List */}
      <Animated.FlatList
        data={filteredNotifications}
        renderItem={({ item, index }) => (
          <NotificationCard
            notification={item}
            index={index}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primaryBlue} />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              {filter !== 'all' ? 'No notifications of this type' : 'You\'re all caught up!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C2DFF7',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    color: '#121723',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: '#666',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    color: COLORS.primaryBlue,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCC',
    backgroundColor: '#FFFFFF',
  },
  activeFilterChip: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Satoshi-Medium',
    color: '#666',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryBlue,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    color: '#121723',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontFamily: 'Satoshi-Black',
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Regular',
    color: '#999',
  },
  notificationMessage: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    color: '#666',
    lineHeight: 18,
  },
  groupTag: {
    fontSize: 11,
    fontFamily: 'Satoshi-Medium',
    color: COLORS.primaryBlue,
    marginTop: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryBlue,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Satoshi-Black',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    color: '#BBB',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Satoshi-Medium',
    color: '#666',
    marginTop: 12,
  },
});

export default AdminNotificationsScreen;
