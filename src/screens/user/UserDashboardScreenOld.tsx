import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading, BodyText, Caption } from '../../components/core/Typography';
import { ProgressRing } from '../../components/core/ProgressRing';
import { TransactionCard } from '../../components/transaction/TransactionCard';
import { useTransactions } from '../../hooks/useTransactions';
import { SPACING, COLORS, RADIUS } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Bell,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Scan,
  BarChart3,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

export const UserDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  // Budget calculation
  const monthlyBudget = 30000;
  const budgetUsed = Math.min((totalExpense / monthlyBudget) * 100, 100);

  // Recent transactions
  const recentTransactions = transactions.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Animated Background Orbs */}
      <View style={styles.backgroundOrbs}>
        <Animated.View
          entering={FadeInUp.delay(100).duration(1000)}
          style={[styles.orb, styles.orb1]}
        >
          <LinearGradient
            colors={['rgba(189, 224, 254, 0.4)', 'rgba(189, 224, 254, 0.1)']}
            style={styles.orbGradient}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(200).duration(1000)}
          style={[styles.orb, styles.orb2]}
        >
          <LinearGradient
            colors={['rgba(230, 204, 255, 0.4)', 'rgba(230, 204, 255, 0.1)']}
            style={styles.orbGradient}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(300).duration(1000)}
          style={[styles.orb, styles.orb3]}
        >
          <LinearGradient
            colors={['rgba(255, 228, 225, 0.4)', 'rgba(255, 228, 225, 0.1)']}
            style={styles.orbGradient}
          />
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View>
            <Caption color={COLORS.grayText} style={styles.greeting}>
              Good Morning
            </Caption>
            <Heading level={2} color={COLORS.navyText} style={styles.userName}>
              Alex Johnson
            </Heading>
          </View>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
            }}
            android_ripple={{ color: `${COLORS.babyBlue}30`, borderless: true }}
            style={styles.notificationButton}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(250, 250, 255, 0.9)']}
              style={styles.notificationGradient}
            >
              <Bell size={20} color={COLORS.navyText} strokeWidth={2.5} />
              <View style={styles.notificationBadge} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Balance Card - Premium Material You */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactMedium');
            }}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
            style={styles.balanceCardWrapper}
          >
            <LinearGradient
              colors={COLORS.gradientPinkBlue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              {/* Animated Shine Effect */}
              <View style={styles.shineOverlay}>
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0)',
                    'rgba(255, 255, 255, 0.15)',
                    'rgba(255, 255, 255, 0)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.balanceHeader}>
                <View style={styles.walletIconContainer}>
                  <Wallet size={20} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Caption style={styles.balanceLabel}>Total Balance</Caption>
              </View>

              <Heading level={1} color="#FFFFFF" style={styles.balanceAmount}>
                ₹{totalBalance?.toLocaleString('en-IN')}
              </Heading>

              <View style={styles.balanceStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <ArrowDownRight size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <View style={styles.statContent}>
                    <Caption style={styles.statLabel}>Income</Caption>
                    <BodyText color="#FFFFFF" medium style={styles.statValue}>
                      ₹{totalIncome.toLocaleString('en-IN')}
                    </BodyText>
                  </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <ArrowUpRight size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <View style={styles.statContent}>
                    <Caption style={styles.statLabel}>Expense</Caption>
                    <BodyText color="#FFFFFF" medium style={styles.statValue}>
                      ₹{totalExpense.toLocaleString('en-IN')}
                    </BodyText>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Quick Actions - Material You Mini FABs */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.quickActionsSection}
        >
          <View style={styles.quickActions}>
            <QuickActionFAB
              icon={<Plus size={22} strokeWidth={2.5} />}
              label="Add"
              gradient={COLORS.gradientPeach}
              onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
            />
            <QuickActionFAB
              icon={<Scan size={22} strokeWidth={2.5} />}
              label="Scan"
              gradient={COLORS.gradientMint}
              onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
            />
            <QuickActionFAB
              icon={<BarChart3 size={22} strokeWidth={2.5} />}
              label="Reports"
              gradient={COLORS.gradientBlue}
              onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
            />
            <QuickActionFAB
              icon={<Users size={22} strokeWidth={2.5} />}
              label="Groups"
              gradient={COLORS.gradientLavender}
              onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
            />
          </View>
        </Animated.View>

        {/* Budget Ring - Material You Surface */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(250, 250, 255, 0.9)']}
            style={styles.budgetCard}
          >
            <View style={styles.budgetHeader}>
              <View>
                <Heading level={4} color={COLORS.navyText}>
                  Monthly Budget
                </Heading>
                <Caption color={COLORS.grayText} style={styles.budgetSubtitle}>
                  {new Date().toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Caption>
              </View>
              <View style={styles.trendBadge}>
                <TrendingUp
                  size={14}
                  color={COLORS.successGreen}
                  strokeWidth={2.5}
                />
                <Caption color={COLORS.successGreen} medium>
                  12%
                </Caption>
              </View>
            </View>

            <View style={styles.budgetRingContainer}>
              <ProgressRing
                progress={budgetUsed}
                size={140}
                strokeWidth={14}
                color={COLORS.babyBlue}
                backgroundColor={COLORS.borderGray}
                label={`₹${totalExpense.toLocaleString('en-IN')}`}
                sublabel={`of ₹${monthlyBudget.toLocaleString('en-IN')}`}
              />

              <View style={styles.budgetDetails}>
                <View style={styles.budgetDetailItem}>
                  <View
                    style={[
                      styles.budgetDot,
                      { backgroundColor: COLORS.babyBlue },
                    ]}
                  />
                  <Caption color={COLORS.grayText}>Spent</Caption>
                  <Caption color={COLORS.navyText} medium>
                    {budgetUsed.toFixed(0)}%
                  </Caption>
                </View>
                <View style={styles.budgetDetailItem}>
                  <View
                    style={[
                      styles.budgetDot,
                      { backgroundColor: COLORS.borderGray },
                    ]}
                  />
                  <Caption color={COLORS.grayText}>Remaining</Caption>
                  <Caption color={COLORS.navyText} medium>
                    {(100 - budgetUsed).toFixed(0)}%
                  </Caption>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Chit Fund Preview - Material You Surface */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Pressable
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              navigation.navigate('Groups');
            }}
            android_ripple={{ color: `${COLORS.babyBlue}20` }}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(250, 250, 255, 0.9)']}
              style={styles.chitCard}
            >
              <View style={styles.chitHeader}>
                <View style={styles.chitIconWrapper}>
                  <LinearGradient
                    colors={COLORS.gradientMint}
                    style={styles.chitIcon}
                  >
                    <Users size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </View>
                <View style={styles.chitInfo}>
                  <Heading level={4} color={COLORS.navyText}>
                    Active Chit Funds
                  </Heading>
                  <View style={styles.chitMeta}>
                    <Caption color={COLORS.grayText}>3 groups</Caption>
                    <View style={styles.metaDot} />
                    <Caption color={COLORS.babyBlue} medium>
                      Next draw in 5 days
                    </Caption>
                  </View>
                </View>
                <Calendar size={20} color={COLORS.grayText} strokeWidth={2} />
              </View>

              <View style={styles.chitGroups}>
                <View style={styles.chitGroupItem}>
                  <LinearGradient
                    colors={[
                      'rgba(189, 224, 254, 0.3)',
                      'rgba(189, 224, 254, 0.1)',
                    ]}
                    style={styles.chitGroupBadge}
                  >
                    <Caption color={COLORS.navyText} medium>
                      Friends
                    </Caption>
                  </LinearGradient>
                </View>
                <View style={styles.chitGroupItem}>
                  <LinearGradient
                    colors={[
                      'rgba(230, 204, 255, 0.3)',
                      'rgba(230, 204, 255, 0.1)',
                    ]}
                    style={styles.chitGroupBadge}
                  >
                    <Caption color={COLORS.navyText} medium>
                      Office
                    </Caption>
                  </LinearGradient>
                </View>
                <View style={styles.chitGroupItem}>
                  <LinearGradient
                    colors={[
                      'rgba(255, 228, 225, 0.3)',
                      'rgba(255, 228, 225, 0.1)',
                    ]}
                    style={styles.chitGroupBadge}
                  >
                    <Caption color={COLORS.navyText} medium>
                      Family
                    </Caption>
                  </LinearGradient>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          style={styles.transactionsSection}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Heading level={4} color={COLORS.navyText}>
                Recent Transactions
              </Heading>
              <Caption color={COLORS.grayText}>Last 3 transactions</Caption>
            </View>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                navigation.navigate('Transactions');
              }}
              android_ripple={{
                color: `${COLORS.babyBlue}30`,
                borderless: true,
              }}
              style={styles.seeAllButton}
            >
              <BodyText color={COLORS.babyBlue} medium>
                See All
              </BodyText>
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
                    onPress={() =>
                      ReactNativeHapticFeedback.trigger('impactLight')
                    }
                    compact
                  />
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Sparkles
                    size={32}
                    color={COLORS.grayText}
                    strokeWidth={1.5}
                  />
                </View>
                <Caption color={COLORS.grayText} align="center">
                  No transactions yet.{'\n'}Tap + to add your first transaction!
                </Caption>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const QuickActionFAB: React.FC<{
  icon: React.ReactNode;
  label: string;
  gradient: string[];
  onPress: () => void;
}> = ({ icon, label, gradient, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { damping: 12, stiffness: 200 }) },
    ],
  }));

  const handlePressIn = () => {
    scale.value = 0.92;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  return (
    <View style={styles.quickActionWrapper}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
      >
        <Animated.View style={animatedStyle}>
          <LinearGradient colors={gradient} style={styles.miniFAB}>
            {React.cloneElement(icon as React.ReactElement<any>, {
              color: '#FFFFFF',
            })}
          </LinearGradient>
          <Caption
            color={COLORS.navyText}
            medium
            style={styles.quickActionLabel}
            align="center"
          >
            {label}
          </Caption>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  backgroundOrbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orb1: {
    width: 280,
    height: 280,
    top: -100,
    right: -80,
  },
  orb2: {
    width: 200,
    height: 200,
    top: 180,
    left: -60,
  },
  orb3: {
    width: 240,
    height: 240,
    bottom: 200,
    right: -100,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
  },
  notificationButton: {
    borderRadius: RADIUS.round,
    overflow: 'hidden',
    elevation: 4,
  },
  notificationGradient: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.errorPink,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  balanceCardWrapper: {
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    elevation: 8,
  },
  balanceCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  walletIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    marginBottom: SPACING.lg,
    letterSpacing: -1,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: SPACING.sm,
  },
  quickActionsSection: {
    marginBottom: SPACING.xl,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  quickActionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  miniFAB: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xxl,
    marginBottom: SPACING.xl,
    elevation: 3,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  budgetSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.successGreen}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  budgetRingContainer: {
    alignItems: 'center',
  },
  budgetDetails: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.xl,
  },
  budgetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  budgetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chitCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xxl,
    marginBottom: SPACING.xl,
    elevation: 3,
  },
  chitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chitIconWrapper: {
    marginRight: SPACING.md,
  },
  chitIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  chitInfo: {
    flex: 1,
  },
  chitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: SPACING.xs,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.grayText,
  },
  chitGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chitGroupItem: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  chitGroupBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  transactionsSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  seeAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  transactionsList: {
    gap: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.grayText}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
});
