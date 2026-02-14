/**
 * UserDashboardScreen - Redesigned with Pastel Theme
 * Soft, calm, premium Material You design for Android
 * Features: Soft gradients, airy spacing, smooth animations
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Sparkles } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// New Pastel Components
import {
  BalanceCard,
  QuickActionsRow,
  BudgetDonut,
  ChitPreviewCard,
  FloatingBottomBar,
} from '../../components/home';

// Hooks & Utils
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionCard } from '../../components/transaction/TransactionCard';

// Design Tokens
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

export const UserDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  // Budget calculation
  const monthlyBudget = 30000;
  const trend = 12; // 12% increase this month

  // Recent transactions
  const recentTransactions = transactions.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Soft Gradient Background */}
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated Background Orbs */}
      <View style={styles.backgroundOrbs}>
        <Animated.View
          entering={FadeInUp.delay(100).duration(1500)}
          style={[styles.orb, styles.orb1]}
        >
          <LinearGradient
            colors={['rgba(168, 176, 240, 0.15)', 'rgba(168, 176, 240, 0.05)']}
            style={styles.orbGradient}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(200).duration(1500)}
          style={[styles.orb, styles.orb2]}
        >
          <LinearGradient
            colors={['rgba(228, 150, 178, 0.12)', 'rgba(228, 150, 178, 0.04)']}
            style={styles.orbGradient}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(300).duration(1500)}
          style={[styles.orb, styles.orb3]}
        >
          <LinearGradient
            colors={['rgba(145, 186, 236, 0.12)', 'rgba(145, 186, 236, 0.04)']}
            style={styles.orbGradient}
          />
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 140 },
        ]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.userName}>Alex Johnson</Text>
          </View>

          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
            }}
            android_ripple={{ color: `${colors.primaryMuted}30`, borderless: true }}
            style={styles.notificationButton}
          >
            <View style={styles.notificationContainer}>
              <Bell size={20} color={colors.textTitle} strokeWidth={2.5} />
              <View style={styles.notificationBadge} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <BalanceCard
            balance={totalBalance}
            trend={trend}
            onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
          />
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <QuickActionsRow
            onSendPress={() => console.log('Send')}
            onRequestPress={() => console.log('Request')}
            onAddPress={() => console.log('Add')}
            onReportsPress={() => navigation.navigate('Reports')}
          />
        </Animated.View>

        {/* Monthly Budget Card */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View>
                <Text style={styles.budgetTitle}>Monthly Budget</Text>
                <Text style={styles.budgetSubtitle}>
                  {new Date().toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.trendBadge}>
                <Text style={styles.trendText}>↑ 12%</Text>
              </View>
            </View>

            <View style={styles.budgetContent}>
              <BudgetDonut spent={totalExpense} total={monthlyBudget} />
            </View>
          </View>
        </Animated.View>

        {/* Chit Fund Preview */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <ChitPreviewCard
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              navigation.navigate('Groups');
            }}
          />
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.sectionSubtitle}>Last 3 transactions</Text>
            </View>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                navigation.navigate('Transactions');
              }}
              android_ripple={{ color: `${colors.primaryMuted}30`, borderless: true }}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>

          <View style={styles.transactionsList}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <Animated.View
                  key={transaction.id}
                  entering={FadeInDown.delay(700 + index * 100).springify()}
                >
                  <TransactionCard
                    transaction={transaction}
                    onPress={() => ReactNativeHapticFeedback.trigger('impactLight')}
                    compact
                  />
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Sparkles size={32} color={colors.textMuted} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>
                  No transactions yet.{'\n'}Tap + to add your first transaction!
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <FloatingBottomBar
        activeRoute="Dashboard"
        onHomePress={() => navigation.navigate('Dashboard')}
        onReportsPress={() => navigation.navigate('Reports')}
        onFabPress={() => console.log('Add Transaction')}
        onNotificationsPress={() => console.log('Notifications')}
        onProfilePress={() => navigation.navigate('Settings')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -120,
    right: -100,
  },
  orb2: {
    width: 220,
    height: 220,
    top: 200,
    left: -80,
  },
  orb3: {
    width: 260,
    height: 260,
    bottom: 180,
    right: -110,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 4,
  },
  userName: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.textTitle,
    letterSpacing: -0.5,
  },
  notificationButton: {
    borderRadius: radii.round,
  },
  notificationContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  budgetCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  budgetTitle: {
    ...typography.section,
    marginBottom: 4,
  },
  budgetSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  trendBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  trendText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.success,
    fontWeight: '600',
  },
  budgetContent: {
    alignItems: 'center',
  },
  transactionsSection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m,
  },
  sectionTitle: {
    ...typography.section,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  seeAllButton: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
  },
  seeAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  transactionsList: {
    gap: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.textMuted}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
