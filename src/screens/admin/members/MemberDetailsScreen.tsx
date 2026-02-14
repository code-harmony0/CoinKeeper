/**
 * MemberDetailsScreen
 * Detailed profile view for a member
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ArrowLeft, Mail, Phone, Calendar, Shield, DollarSign, Users, Clock } from 'lucide-react-native';
import { theme } from '../../../theme';
import { useMembers } from '../../../hooks/useMembers';
import { MemberStatusChip, MemberStatus } from '../../../components/member/MemberStatusChip';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface MemberDetailsScreenProps {
  route: { params: { memberId: string } };
  navigation: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MemberDetailsScreen: React.FC<MemberDetailsScreenProps> = ({ route, navigation }) => {
  const { memberId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const { getMemberById, suspendMember } = useMembers();
  const member = getMemberById(memberId);
  const [activeTab, setActiveTab] = useState('overview');

  if (!member) return null;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'history', label: 'History' },
    { key: 'groups', label: 'Groups' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.tabContent}>
            {/* Contact Info Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Information</Text>
              <View style={styles.infoRow}>
                <View style={styles.iconBox}>
                  <Mail size={20} color={theme.colors.primaryBlue} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{member.email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.iconBox}>
                  <Phone size={20} color={theme.colors.primaryBlue} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{member.phone}</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Calendar size={24} color="#7B1FA2" style={{ marginBottom: 8 }} />
                <Text style={styles.statLabel}>Joined</Text>
                <Text style={styles.statValue}>{member.joinedDate.toLocaleDateString()}</Text>
              </View>
              <View style={styles.statCard}>
                <Users size={24} color="#00695C" style={{ marginBottom: 8 }} />
                <Text style={styles.statLabel}>Groups</Text>
                <Text style={styles.statValue}>{member.groups.length}</Text>
              </View>
            </View>
          </Animated.View>
        );
      default:
        return (
          <View style={styles.emptyTab}>
            <Text style={styles.emptyText}>No data available yet</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#121723" strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Member Profile</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>
                {member.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{member.name}</Text>
              <MemberStatusChip status={member.status as MemberStatus} />
            </View>
          </View>
          
          <View style={styles.heroDivider} />
          
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Trust Score</Text>
              <View style={styles.trustBadge}>
                <Shield size={16} color="#2E7D32" />
                <Text style={styles.trustScore}>{member.riskScore}%</Text>
              </View>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Total Contributed</Text>
              <Text style={styles.contributionValue}>₹{member.totalContributed.toLocaleString()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                setActiveTab(tab.key);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <Animated.View entering={FadeInDown} style={styles.activeIndicator} />}
            </Pressable>
          ))}
        </View>

        {renderTabContent()}
      </ScrollView>

      {/* Footer Actions */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        {member.status !== 'suspended' ? (
          <Pressable
            style={({ pressed }) => [
              styles.suspendButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('notificationWarning');
              // In a real app, show an Alert confirmation here
              suspendMember(member.id);
            }}
          >
            <Shield size={20} color="#C62828" strokeWidth={2.5} />
            <Text style={styles.suspendText}>Suspend Member</Text>
          </Pressable>
        ) : (
          <View style={styles.suspendedBanner}>
            <Shield size={20} color="#C62828" />
            <Text style={styles.suspendedText}>Member Suspended</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32, // Bento Squircle
    padding: 24,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 28, // Squircle
    backgroundColor: '#E2B6CF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#121723',
  },
  heroInfo: {
    flex: 1,
    gap: 8,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#121723',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 24,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroStat: {
    alignItems: 'center',
    gap: 4,
  },
  heroStatLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trustScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  contributionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#121723',
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: '#F8FAFC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#121723',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#121723',
  },
  // Tab Content
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    ...theme.shadows.soft,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121723',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    ...theme.shadows.soft,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
  },
  emptyTab: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textTertiary,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suspendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    height: 56,
    borderRadius: 28,
    gap: 12,
  },
  suspendText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C62828',
  },
  suspendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    height: 56,
    borderRadius: 28,
    gap: 12,
    opacity: 0.8,
  },
  suspendedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C62828',
  },
});
