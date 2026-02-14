/**
 * AdminDashboardScreenV2 - Premium Fintech Admin Dashboard
 * Award-winning design with reusable MetricCard system
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
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react-native';
import { MetricCard } from '../../components/shared/MetricCard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type TabType = 'overview' | 'groups' | 'transactions' | 'analytics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const AdminDashboardScreenV2: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const handleTabChange = (tab: TabType) => {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: true,
    });
    setActiveTab(tab);
  };

  const handleCardPress = (cardName: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
    });
    console.log(`Card pressed: ${cardName}`);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'groups', label: 'Groups' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'analytics', label: 'Analytics' },
  ];

  const renderOverview = () => (
    <View>
      {/* Hero Metrics */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <MetricCard
          title="Total Revenue"
          value="₹2,45,680"
          subtitle="+12.5% from last month"
          description="Outstanding performance this quarter"
          icon={<TrendingUp size={28} color="#121723" strokeWidth={2.5} />}
          color="#C2DFF7"
          patternVariant="wave"
          animationVariant="mount"
          size="large"
          onPress={() => handleCardPress('Total Revenue')}
        />
      </Animated.View>

      {/* Two Column Cards */}
      <View style={styles.row}>
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Active Groups"
            value="24"
            subtitle="3 new today"
            icon={<Users size={24} color="#121723" strokeWidth={2.5} />}
            color="#D8E2FA"
            patternVariant="circle"
            animationVariant="pulse"
            size="small"
            onPress={() => handleCardPress('Active Groups')}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Members"
            value="1,248"
            subtitle="+45 this week"
            icon={<Activity size={24} color="#121723" strokeWidth={2.5} />}
            color="#CFD9F1"
            patternVariant="dot"
            animationVariant="hover"
            size="small"
            onPress={() => handleCardPress('Members')}
          />
        </Animated.View>
      </View>

      {/* Financial Metrics */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <MetricCard
          title="Monthly Contributions"
          value="₹1,85,400"
          subtitle="From 18 active groups"
          description="98.5% collection rate - excellent!"
          icon={<DollarSign size={28} color="#121723" strokeWidth={2.5} />}
          color="#C2DFF7"
          patternVariant="grid"
          animationVariant="mount"
          size="large"
          onPress={() => handleCardPress('Monthly Contributions')}
        />
      </Animated.View>

      {/* Performance Cards */}
      <View style={styles.row}>
        <Animated.View
          entering={FadeInDown.delay(350).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Pending Draws"
            value="7"
            subtitle="Next: Tomorrow"
            icon={<Calendar size={24} color="#121723" strokeWidth={2.5} />}
            color="#D8E2FA"
            patternVariant="wave"
            animationVariant="pulse"
            size="small"
            onPress={() => handleCardPress('Pending Draws')}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Approvals"
            value="12"
            subtitle="Needs review"
            icon={<CreditCard size={24} color="#121723" strokeWidth={2.5} />}
            color="#CFD9F1"
            patternVariant="circle"
            animationVariant="hover"
            size="small"
            onPress={() => handleCardPress('Approvals')}
          />
        </Animated.View>
      </View>
    </View>
  );

  const renderGroups = () => (
    <View>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <MetricCard
          title="Total Groups"
          value="24"
          subtitle="4 created this month"
          description="Managing ₹12.5L total pool value"
          icon={<Users size={28} color="#121723" strokeWidth={2.5} />}
          color="#D8E2FA"
          patternVariant="circle"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>

      <View style={styles.row}>
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Active"
            value="18"
            subtitle="75% of total"
            icon={<ArrowUpRight size={24} color="#2E7D32" strokeWidth={2.5} />}
            color="#C2DFF7"
            patternVariant="dot"
            animationVariant="pulse"
            size="small"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Closed"
            value="6"
            subtitle="25% of total"
            icon={<ArrowDownRight size={24} color="#D32F2F" strokeWidth={2.5} />}
            color="#CFD9F1"
            patternVariant="grid"
            animationVariant="hover"
            size="small"
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <MetricCard
          title="Avg Members per Group"
          value="52"
          subtitle="Optimal group size"
          description="Groups averaging 52 members show best retention"
          icon={<Activity size={28} color="#121723" strokeWidth={2.5} />}
          color="#D8E2FA"
          patternVariant="wave"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>
    </View>
  );

  const renderTransactions = () => (
    <View>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <MetricCard
          title="Today's Transactions"
          value="₹48,250"
          subtitle="126 transactions"
          description="Processing time: avg 2.3 seconds"
          icon={<DollarSign size={28} color="#121723" strokeWidth={2.5} />}
          color="#C2DFF7"
          patternVariant="grid"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>

      <View style={styles.row}>
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Success Rate"
            value="98.5%"
            subtitle="Excellent"
            icon={<TrendingUp size={24} color="#2E7D32" strokeWidth={2.5} />}
            color="#D8E2FA"
            patternVariant="circle"
            animationVariant="pulse"
            size="small"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Pending"
            value="4"
            subtitle="Under review"
            icon={<Clock size={24} color="#F57C00" strokeWidth={2.5} />}
            color="#CFD9F1"
            patternVariant="dot"
            animationVariant="hover"
            size="small"
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <MetricCard
          title="Weekly Volume"
          value="₹3.2L"
          subtitle="+18% from last week"
          description="Strong growth trajectory maintained"
          icon={<Activity size={28} color="#121723" strokeWidth={2.5} />}
          color="#C2DFF7"
          patternVariant="wave"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>
    </View>
  );

  const renderAnalytics = () => (
    <View>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <MetricCard
          title="Growth Rate"
          value="+24.8%"
          subtitle="Month over month"
          description="Exceptional growth in all key metrics"
          icon={<TrendingUp size={28} color="#2E7D32" strokeWidth={2.5} />}
          color="#C2DFF7"
          patternVariant="wave"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>

      <View style={styles.row}>
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Retention"
            value="94%"
            subtitle="Member retention"
            icon={<Users size={24} color="#121723" strokeWidth={2.5} />}
            color="#D8E2FA"
            patternVariant="circle"
            animationVariant="pulse"
            size="small"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={{ width: CARD_WIDTH }}
        >
          <MetricCard
            title="Avg Contribution"
            value="₹5,240"
            subtitle="Per member"
            icon={<DollarSign size={24} color="#121723" strokeWidth={2.5} />}
            color="#CFD9F1"
            patternVariant="grid"
            animationVariant="hover"
            size="small"
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <MetricCard
          title="Platform Health Score"
          value="9.4/10"
          subtitle="Excellent status"
          description="All systems operational, performance optimal"
          icon={<Activity size={28} color="#2E7D32" strokeWidth={2.5} />}
          color="#D8E2FA"
          patternVariant="dot"
          animationVariant="mount"
          size="large"
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.adminName}>Admin</Text>
        </View>
        <View style={styles.badge}>
          <Activity size={20} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <Animated.View
        entering={FadeInDown.delay(50).springify()}
        style={styles.tabContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab, index) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => handleTabChange(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'analytics' && renderAnalytics()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: '#121723',
    opacity: 0.6,
    marginBottom: 4,
  },
  adminName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121723',
    letterSpacing: -0.5,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#121723',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabScrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
  },
  tabActive: {
    backgroundColor: '#121723',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121723',
    opacity: 0.6,
  },
  tabTextActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 0,
  },
});
