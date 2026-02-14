/**
 * HomeScreen - Finance App Dashboard
 * Enhanced with cool animations and muted color palette
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  Easing,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownRight,
  ArrowUpRight,
  Scan,
  Download,
  Upload,
  Plus,
} from 'lucide-react-native';

import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';
import { useTransactions } from '../../hooks/useTransactions';

type Props = any;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const [balanceVisible, setBalanceVisible] = useState(true);

  // Calculate financial data
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  // Animation values for cool effects
  const scrollY = useSharedValue(0);

  // Format balance display
  const formatBalance = (amount: number) => {
    const [whole, decimal] = amount.toFixed(2).split('.');
    return { whole, decimal };
  };

  const { whole, decimal } = formatBalance(totalBalance);

  // Parallax effect for balance card
  const balanceCardStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -20],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.95],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Scroll handler for parallax effect
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.m, paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* Header - Slide in from right */}
        <Animated.View entering={SlideInRight.delay(100).springify().damping(20).stiffness(90)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi Imran! 👋</Text>
            <Text style={styles.subtitle}>Ready to start your day?</Text>
          </View>
        </Animated.View>

        {/* Balance Card - Fade in up with parallax */}
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(18).stiffness(100)}
          style={[styles.balanceCard, balanceCardStyle]}
        >
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <View style={styles.balanceAmount}>
            <Text style={styles.balanceDollar}>$</Text>
            <Text style={styles.balanceWhole}>{whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
            <Text style={styles.balanceDecimal}>.{decimal}</Text>
          </View>
        </Animated.View>

        {/* Quick Actions - Fade in from bottom to avoid overlap */}
        <Animated.View entering={FadeInDown.delay(400).springify().damping(20)} style={styles.quickActions}>
          <ActionPill icon={ArrowDownRight} label="Transfer" onPress={() => {}} delay={500} />
          <ActionPill icon={Scan} label="Pay QR" onPress={() => {}} delay={550} />
          <ActionPill icon={Download} label="Deposit" onPress={() => {}} delay={600} />
          <ActionPill icon={Upload} label="Withdraw" onPress={() => {}} delay={650} />
        </Animated.View>

        {/* All Transactions Header - Fade in from left */}
        <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Transactions</Text>
          <Pressable>
            <Text style={styles.viewAllText}>Today ▼</Text>
          </Pressable>
        </Animated.View>

        {/* Quick Contacts List - Staggered fade in */}
        <Animated.View entering={FadeInUp.delay(750).springify().damping(18)} style={styles.contactsList}>
          <Pressable style={styles.addContactButton}>
            <Plus size={24} color={colors.white} strokeWidth={2} />
          </Pressable>
          {['Jack', 'Alex', 'Sarah'].map((name, index) => (
            <ContactAvatar key={index} name={name} index={index} />
          ))}
        </Animated.View>

        {/* Choose Transfer Section - Slide in */}
        <Animated.View entering={SlideInRight.delay(850).springify().damping(20)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose Transfer</Text>
          <Pressable>
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </Animated.View>

        {/* Transfer Options - Staggered entrance */}
        <Animated.View entering={FadeInUp.delay(920).springify().damping(18)} style={styles.transferOptions}>
          <TransferCard
            icon={ArrowDownRight}
            title="Transfer"
            subtitle="to contacts"
            iconBackground={colors.iconBackgroundBlue}
            delay={950}
          />
          <TransferCard
            icon={Upload}
            title="Transfer"
            subtitle="card number"
            iconBackground={colors.iconBackgroundPurple}
            delay={1020}
          />
        </Animated.View>

        {/* Spending Overview - Elegant fade in */}
        <Animated.View entering={FadeInUp.delay(1100).springify().damping(18).stiffness(90)} style={styles.spendingCard}>
          <View style={styles.spendingHeader}>
            <Text style={styles.spendingTitle}>Spending</Text>
            <View style={styles.spendingTabs}>
              <Pressable style={[styles.tab, styles.tabActive]}>
                <Text style={styles.tabTextActive}>Spend</Text>
              </Pressable>
              <Pressable style={styles.tab}>
                <Text style={styles.tabText}>Income</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.spendingItems}>
            <SpendingItem
              icon="☕"
              label="Cafe"
              amount="$347.05"
            />
            <SpendingItem
              icon="🚗"
              label="Taxi"
              amount="$187.02"
            />
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

// Action Pill Component with individual entrance animation
interface ActionPillProps {
  icon: any;
  label: string;
  onPress: () => void;
  delay?: number;
}

const ActionPill: React.FC<ActionPillProps> = ({ icon: Icon, label, onPress, delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  // Individual entrance animation
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 18, stiffness: 100 })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 18, stiffness: 250 }),
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 250 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.actionPill}
      >
        <View style={styles.actionIconContainer}>
          <Icon size={20} color={colors.textPrimary} strokeWidth={2} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

// Contact Avatar Component with scale animation
interface ContactAvatarProps {
  name: string;
  index?: number;
}

const ContactAvatar: React.FC<ContactAvatarProps> = ({ name, index = 0 }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const getInitials = (name: string) => name.charAt(0);
  const colors_list = ['#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD'];
  const bgColor = colors_list[Math.floor(Math.random() * colors_list.length)];

  // Staggered entrance animation
  useEffect(() => {
    const delay = 700 + (index * 80);
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 120 })
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.contactAvatarContainer, animatedStyle]}>
      <View style={[styles.contactAvatar, { backgroundColor: bgColor }]}>
        <Text style={styles.contactInitial}>{getInitials(name)}</Text>
      </View>
      <Text style={styles.contactName}>{name}</Text>
    </Animated.View>
  );
};

// Transfer Card Component with press animation
interface TransferCardProps {
  icon: any;
  title: string;
  subtitle: string;
  iconBackground: string;
  delay?: number;
}

const TransferCard: React.FC<TransferCardProps> = ({ icon: Icon, title, subtitle, iconBackground, delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Entrance animation
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 250 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 250 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.transferCard}
      >
        <View style={[styles.transferIconContainer, { backgroundColor: iconBackground }]}>
          <Icon size={24} color={colors.textPrimary} strokeWidth={2} />
        </View>
        <Text style={styles.transferTitle}>{title}</Text>
        <Text style={styles.transferSubtitle}>{subtitle}</Text>
      </Pressable>
    </Animated.View>
  );
};

// Spending Item Component
interface SpendingItemProps {
  icon: string;
  label: string;
  amount: string;
}

const SpendingItem: React.FC<SpendingItemProps> = ({ icon, label, amount }) => {
  return (
    <View style={styles.spendingItem}>
      <View style={styles.spendingIconContainer}>
        <Text style={styles.spendingIcon}>{icon}</Text>
      </View>
      <Text style={styles.spendingLabel}>{label}</Text>
      <Text style={styles.spendingAmount}>{amount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.l,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginBottom: spacing.l,
    ...shadows.card,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.s,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balanceDollar: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xxs,
    marginTop: spacing.xs,
  },
  balanceWhole: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  balanceDecimal: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.balanceDecimal,
    marginTop: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.xl,
  },
  actionPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.button,
    padding: spacing.m,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackgroundBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  contactsList: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  addContactButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  contactAvatarContainer: {
    alignItems: 'center',
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  contactInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.white,
  },
  contactName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  transferOptions: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  transferCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.l,
    alignItems: 'center',
    ...shadows.card,
  },
  transferIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  transferSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  spendingCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.l,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  spendingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  spendingTabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardSecondary,
    borderRadius: radii.pill,
    padding: spacing.xxs,
  },
  tab: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: colors.black,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  spendingItems: {
    flexDirection: 'row',
    gap: spacing.l,
  },
  spendingItem: {
    flex: 1,
    alignItems: 'center',
  },
  spendingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.iconBackgroundBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  spendingIcon: {
    fontSize: 28,
  },
  spendingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  spendingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default HomeScreen;
