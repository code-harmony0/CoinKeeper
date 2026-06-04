/**
 * GroupDetailsScreen - ULTRA MODERN BENTO
 * Comprehensive group details with premium animations, squircle layout, and card art
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Defs, Pattern } from 'react-native-svg';
import {
  ArrowLeft,
  Edit2,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Archive,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Activity,
  X,
  Trash2,
} from 'lucide-react-native';
import { useGroupDetails } from '../../../hooks/useGroups';
import {
  StatusChip,
  StatCard,
  ToggleSwitch,
} from '../../../components/group';
import { Button } from '../../../components/ui/Button';
import { theme } from '../../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTabBarScroll } from '../../../context/TabBarScrollContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GroupDetailsScreenProps {
  route: {
    params: {
      groupId: string;
    };
  };
  navigation: any;
}

type Tab = 'overview' | 'members' | 'transactions' | 'draws';

// ============================================
// RICH DUMMY DATA (For enhanced visuals)
// ============================================
const DUMMY_MEMBERS = [
  { id: 'd1', name: 'Aarav Patel', role: 'admin', status: 'active', joinedAt: new Date(), avatarColor: '#E3F2FD', avatarText: '#1976D2' },
  { id: 'd2', name: 'Ishaan Kumar', role: 'member', status: 'active', joinedAt: new Date(), avatarColor: '#E8F5E9', avatarText: '#2E7D32' },
  { id: 'd3', name: 'Vihaan Singh', role: 'member', status: 'pending', joinedAt: new Date(), avatarColor: '#FFF3E0', avatarText: '#F57C00' },
  { id: 'd4', name: 'Ananya Gupta', role: 'member', status: 'active', joinedAt: new Date(), avatarColor: '#F3E5F5', avatarText: '#7B1FA2' },
  { id: 'd5', name: 'Rohan Sharma', role: 'member', status: 'inactive', joinedAt: new Date(), avatarColor: '#FFEBEE', avatarText: '#D32F2F' },
];

const DUMMY_TRANSACTIONS = [
  { id: 't1', amount: 5000, type: 'contribution', status: 'completed', date: new Date(), memberName: 'Aarav Patel', avatarColor: '#E3F2FD', avatarText: '#1976D2' },
  { id: 't2', amount: 5000, type: 'contribution', status: 'completed', date: new Date(Date.now() - 86400000), memberName: 'Ishaan Kumar', avatarColor: '#E8F5E9', avatarText: '#2E7D32' },
  { id: 't3', amount: 5000, type: 'contribution', status: 'pending', date: new Date(Date.now() - 172800000), memberName: 'Vihaan Singh', avatarColor: '#FFF3E0', avatarText: '#F57C00' },
  { id: 't4', amount: 5000, type: 'contribution', status: 'failed', date: new Date(Date.now() - 259200000), memberName: 'Rohan Sharma', avatarColor: '#FFEBEE', avatarText: '#D32F2F' },
];

const DUMMY_DRAWS = [
  { id: 'dr1', drawNumber: 1, scheduledDate: new Date(Date.now() - 2592000000), status: 'completed', winner: { name: 'Aarav Patel' }, amount: 50000 },
  { id: 'dr2', drawNumber: 2, scheduledDate: new Date(Date.now() + 604800000), status: 'scheduled', winner: null, amount: 50000 },
  { id: 'dr3', drawNumber: 3, scheduledDate: new Date(Date.now() + 3200000000), status: 'scheduled', winner: null, amount: 50000 },
];

export const GroupDetailsScreen: React.FC<GroupDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { groupId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();

  const {
    group,
    members,
    transactions,
    draws,
    isLoading,
    error,
    removeMember,
    addMember,
  } = useGroupDetails(groupId);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isArchiving, setIsArchiving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Add Member Modal State
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Tab Indicator Animation
  const tabIndicatorPos = useSharedValue(0);
  const TAB_BAR_PADDING = 4;
  const CONTAINER_PADDING = 16;
  const TOTAL_HORIZONTAL_PADDING = (CONTAINER_PADDING * 2) + (TAB_BAR_PADDING * 2);
  const TAB_WIDTH = (SCREEN_WIDTH - TOTAL_HORIZONTAL_PADDING) / 4;

  // Scroll Handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleTabPress = (tab: Tab, index: number) => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    setActiveTab(tab);
    tabIndicatorPos.value = withSpring(index * TAB_WIDTH, {
      damping: 15,
      stiffness: 150,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleBack = () => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    navigation.goBack();
  };

  const handleEdit = () => {
    if (group?.closed) {
      Alert.alert('Cannot Edit', 'This group is closed and cannot be edited.');
      return;
    }
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
    });
    navigation.navigate('EditGroup', { groupId });
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Group',
      'Are you sure you want to archive this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setIsArchiving(true);
            ReactNativeHapticFeedback.trigger('notificationWarning', {
              enableVibrateFallback: true,
            });
            setTimeout(() => {
              setIsArchiving(false);
              navigation.goBack();
            }, 1000);
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationWarning', {
              enableVibrateFallback: true,
            });
            removeMember(memberId);
          },
        },
      ]
    );
  };

  const handleAddMemberSubmit = async () => {
    if (!newMemberName || !newMemberPhone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsAddingMember(true);
    try {
      await addMember({
        groupId,
        userName: newMemberName,
        userPhone: newMemberPhone,
        userEmail: '',
        userId: '',
      });
      setIsAddMemberVisible(false);
      setNewMemberName('');
      setNewMemberPhone('');
      Alert.alert('Success', 'Member added successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const tabIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: tabIndicatorPos.value }],
    };
  });

  // Use dummy data if real data is empty
  const displayMembers = members.length > 0 ? members : DUMMY_MEMBERS;
  const displayTransactions = transactions.length > 0 ? transactions : DUMMY_TRANSACTIONS;
  const displayDraws = draws.length > 0 ? draws : DUMMY_DRAWS;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#121723" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </Animated.View>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn} style={styles.errorContainer}>
          <AlertCircle size={64} color="#D32F2F" strokeWidth={2} />
          <Text style={styles.errorText}>Failed to load group</Text>
          <Text style={styles.errorSubtext}>
            Please check your connection and try again
          </Text>
          <Button title="Go Back" onPress={handleBack} />
        </Animated.View>
      </View>
    );
  }

  // ============================================
  // RENDER SECTIONS (BENTO STYLE)
  // ============================================

  const renderOverview = () => (
    <View style={styles.section}>
      {/* Hero Card with Art */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.heroCard}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Circle cx="90%" cy="10%" r="80" fill="#E2B6CF" opacity={0.2} />
            <Circle cx="10%" cy="90%" r="60" fill="#E2B6CF" opacity={0.15} />
          </Svg>
        </View>

        <View style={styles.heroHeader}>
          <View style={styles.heroIconContainer}>
            <Users size={32} color="#AD1457" strokeWidth={2.5} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroLabel}>Group Created</Text>
            <Text style={styles.heroValue}>
              {group.startDate ? formatDate((group.startDate as any).toDate?.() || new Date(group.startDate as any)) : 'N/A'}
            </Text>
          </View>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{group.activeMembers}</Text>
            <Text style={styles.heroStatLabel}>Active Members</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {formatCurrency(group.totalPooled)}
            </Text>
            <Text style={styles.heroStatLabel}>Total Pooled</Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Members"
          value={`${group.activeMembers}/${group.maxMembers}`}
          icon={Users}
          iconColor="#1976D2"
          iconBackgroundColor="#E3F2FD"
          index={0}
        />
        <StatCard
          title="Total Pooled"
          value={formatCurrency(group.totalPooled)}
          icon={DollarSign}
          iconColor="#2E7D32"
          iconBackgroundColor="#E8F5E9"
          index={1}
        />
        <StatCard
          title="Contribution"
          value={formatCurrency(group.contributionAmount)}
          icon={TrendingUp}
          iconColor="#F57C00"
          iconBackgroundColor="#FFF3E0"
          trend={{ value: group.cycleTime, direction: 'neutral' }}
          index={2}
        />
      </View>

      {/* Group Details */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.detailsCard}
      >
        <Text style={styles.cardTitle}>Group Details</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Clock size={20} color="#1976D2" strokeWidth={2.5} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Cycle Time</Text>
            <Text style={styles.detailValue}>{group.cycleTime}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Activity size={20} color="#2E7D32" strokeWidth={2.5} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Auto-debit</Text>
            <ToggleSwitch
              value={group.autoDebit}
              onValueChange={() => {
                ReactNativeHapticFeedback.trigger('impactLight', {
                  enableVibrateFallback: true,
                });
              }}
              disabled={group.status === 'closed'}
            />
          </View>
        </View>

        <View style={[styles.detailRow, styles.detailRowLast]}>
          <View style={styles.detailIcon}>
            <CheckCircle size={20} color="#7B1FA2" strokeWidth={2.5} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Status</Text>
            <StatusChip status={group.status} />
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderMembers = () => (
    <View style={styles.section}>
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionTitle}>Members ({displayMembers.length})</Text>
        <Button
          title="Add"
          icon={<UserPlus size={16} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => setIsAddMemberVisible(true)}
          size="small"
          style={{ borderRadius: 16 }} // Squircle Radius
        />
      </Animated.View>

      <View style={styles.listContainer}>
        {displayMembers.map((member: any, index) => (
          <Animated.View
            key={member.id}
            entering={FadeInDown.delay(index * 50).springify()}
            style={styles.memberCard}
          >
            <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor || '#E3F2FD' }]}>
              <Text style={[styles.memberInitials, { color: member.avatarText || '#1976D2' }]}>
                {((member.name || member.userName) ?? '').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name || member.userName}</Text>
              <View style={styles.memberMeta}>
                <Text style={styles.memberRole}>{member.role || 'Member'}</Text>
                <Text style={styles.memberDot}>•</Text>
                <Text style={styles.memberJoined}>Joined {formatDate((member.joinedAt || member.joinedDate)?.toDate?.() || new Date(member.joinedAt || member.joinedDate))}</Text>
              </View>
            </View>
            <View style={styles.memberActions}>
              <StatusChip status={member.status as any} size="small" />
              <Pressable 
                style={styles.removeBtn}
                onPress={() => handleRemoveMember(member.id)}
              >
                <Trash2 size={18} color="#D32F2F" strokeWidth={2} />
              </Pressable>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderTransactions = () => (
    <View style={styles.section}>
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionTitle}>
          Transactions ({displayTransactions.length})
        </Text>
      </Animated.View>

      <View style={styles.listContainer}>
        {displayTransactions.map((transaction: any, index) => (
          <Animated.View
            key={transaction.id}
            entering={FadeInDown.delay(index * 50).springify()}
            style={styles.txnCard}
          >
            <View style={[styles.txnIcon, { backgroundColor: transaction.avatarColor || '#E8F5E9' }]}>
              <DollarSign size={20} color={transaction.avatarText || '#2E7D32'} strokeWidth={2.5} />
            </View>
            <View style={styles.txnInfo}>
              <Text style={styles.txnName}>{transaction.memberName}</Text>
              <Text style={styles.txnDate}>{formatDate((transaction.date as any).toDate?.() || new Date(transaction.date as any))}</Text>
            </View>
            <View style={styles.txnRight}>
              <Text style={styles.txnAmount}>+{formatCurrency(transaction.amount)}</Text>
              <StatusChip status={transaction.status === 'completed' ? 'active' : transaction.status === 'pending' ? 'pending' : 'closed'} size="small" />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderDraws = () => (
    <View style={styles.section}>
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.sectionHeader}
      >
        <Text style={styles.sectionTitle}>Draws ({displayDraws.length})</Text>
        <Button
          title="Schedule"
          icon={<Calendar size={16} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
          size="small"
          style={{ borderRadius: 16 }} // Squircle Radius
        />
      </Animated.View>

      <View style={styles.listContainer}>
        {displayDraws.map((draw: any, index) => (
          <Animated.View
            key={draw.id}
            entering={FadeInDown.delay(index * 50).springify()}
            style={styles.drawCard}
          >
            <View style={styles.drawHeader}>
              <View style={styles.drawTitleRow}>
                <View style={styles.drawIcon}>
                  <Text style={styles.drawNumber}>#{draw.drawNumber}</Text>
                </View>
                <View>
                  <Text style={styles.drawLabel}>Draw Amount</Text>
                  <Text style={styles.drawAmount}>{formatCurrency(draw.prizeAmount || 0)}</Text>
                </View>
              </View>
              <StatusChip status={draw.status === 'completed' ? 'active' : 'pending'} size="small" />
            </View>
            
            <View style={styles.drawDivider} />
            
            <View style={styles.drawFooter}>
              <View style={styles.drawFooterItem}>
                <Calendar size={14} color={theme.colors.textSecondary} />
                <Text style={styles.drawFooterText}>
                  {draw.scheduledDate ? formatDate((draw.scheduledDate as any).toDate?.() || new Date(draw.scheduledDate as any)) : 'TBD'}
                </Text>
              </View>
              {draw.winnerName && (
                <View style={styles.drawWinnerTag}>
                  <Text style={styles.drawWinnerText}>🏆 {draw.winnerName}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.glassyButton,
            pressed && styles.glassyButtonPressed,
          ]}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#121723" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group.name}
          </Text>
          <StatusChip status={group.status} size="small" />
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.glassyButton,
              pressed && styles.glassyButtonPressed,
            ]}
            onPress={handleEdit}
          >
            <Edit2 size={20} color="#121723" strokeWidth={2.5} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.glassyButton,
              styles.glassyButtonDanger,
              pressed && styles.glassyButtonPressed,
            ]}
            onPress={handleArchive}
          >
            <Archive size={20} color="#D32F2F" strokeWidth={2.5} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Modern Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'members', label: 'Members' },
            { key: 'transactions', label: 'Txns' },
            { key: 'draws', label: 'Draws' },
          ].map((tab, index) => (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key as Tab, index)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + theme.spacing.xxl + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#121723"
            colors={['#121723']}
          />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'draws' && renderDraws()}
      </Animated.ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={isAddMemberVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddMemberVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <Pressable onPress={() => setIsAddMemberVisible(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter member name"
                value={newMemberName}
                onChangeText={setNewMemberName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={newMemberPhone}
                onChangeText={setNewMemberPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Button
              title="Add Member"
              onPress={handleAddMemberSubmit}
              loading={isAddingMember}
              disabled={isAddingMember}
              style={{ marginTop: 8 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2B6CF', // Pink Theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'relative', // For absolute centering
    height: 60, // Fixed height for alignment
  },
  glassyButton: {
    width: 44,
    height: 44,
    borderRadius: 16, // Squircle Radius
    backgroundColor: '#FFFFFF', // Solid White
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10, // Ensure clickable
  },
  glassyButtonDanger: {
    backgroundColor: '#FFFFFF', // Keep white background
    // Icon color will handle the danger semantic
  },
  glassyButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    pointerEvents: 'none', // Allow clicks to pass through to buttons
  },
  headerTitle: {
    fontSize: theme.fonts.size.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    maxWidth: '50%', // Limit width to avoid overlapping buttons
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    zIndex: 10, // Ensure clickable
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20, // Squircle Radius
    padding: 4,
    height: 48,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    width: (Dimensions.get('window').width - 40) / 4, // Matches (16*2 + 4*2) padding
    backgroundColor: '#121723',
    borderRadius: 16, // Squircle Radius
    ...theme.shadows.soft,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.size.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28, // Bento Squircle Radius
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.soft,
    overflow: 'hidden', // For art
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20, // Squircle Radius
    backgroundColor: '#E2B6CF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    fontSize: theme.fonts.size.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  heroValue: {
    fontSize: theme.fonts.size.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: theme.spacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: theme.fonts.size.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  heroStatLabel: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  statsGrid: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28, // Bento Squircle Radius
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  cardTitle: {
    fontSize: theme.fonts.size.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 14, // Squircle Radius
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: theme.fonts.size.base,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.fonts.size.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  listContainer: {
    gap: 12,
  },
  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Squircle
    padding: 16,
    ...theme.shadows.soft,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  memberDot: {
    marginHorizontal: 6,
    color: theme.colors.textTertiary,
  },
  memberJoined: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  removeBtn: {
    padding: 8,
  },
  // Transaction Card
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Squircle
    padding: 16,
    ...theme.shadows.soft,
  },
  txnIcon: {
    width: 44,
    height: 44,
    borderRadius: 16, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txnInfo: {
    flex: 1,
  },
  txnName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  txnDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  // Draw Card
  drawCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Squircle
    padding: 20,
    ...theme.shadows.soft,
  },
  drawHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  drawTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7B1FA2',
  },
  drawLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  drawAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  drawDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
  drawFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  drawWinnerTag: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  drawWinnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F57C00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorSubtext: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28, // Bento Squircle Radius
    padding: 24,
    ...theme.shadows.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121723',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 16, // Squircle Radius
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#121723',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
