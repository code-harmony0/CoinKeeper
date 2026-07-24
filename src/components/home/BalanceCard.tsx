/**
 * BalanceCard Component
 * Premium gradient card showing total balance
 * Features: Soft gradient, smooth animations, tap feedback
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Wallet, TrendingUp, Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BalanceCardProps {
  balance: number;
  currency?: string;
  trend?: number;
  onPress?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  currency = '₹',
  trend = 0,
  onPress,
}) => {
  const [isBalanceVisible, setIsBalanceVisible] = React.useState(true);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const balanceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 18, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 200 });
  };

  const toggleBalanceVisibility = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    opacity.value = withTiming(0, { duration: 100 }, () => {
      opacity.value = withTiming(1, { duration: 100 });
    });
    setIsBalanceVisible(!isBalanceVisible);
  };

  const formatBalance = (amount: number): string => {
    if (!isBalanceVisible) return '••••••';
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
      style={[animatedStyle]}
    >
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={[colors.primaryBlue, colors.primaryBlueDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {/* Subtle shine overlay */}
          <View style={styles.shineOverlay}>
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0)',
                'rgba(255, 255, 255, 0.1)',
                'rgba(255, 255, 255, 0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* Header Row */}
          <View style={styles.header}>
            <View style={styles.labelRow}>
              <View style={styles.iconContainer}>
                <Wallet size={20} color={colors.white} strokeWidth={2.5} />
              </View>
              <Text style={styles.label}>Total Balance</Text>
            </View>

            <Pressable
              onPress={toggleBalanceVisibility}
              hitSlop={12}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
            >
              {isBalanceVisible ? (
                <Eye size={20} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
              ) : (
                <EyeOff size={20} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
              )}
            </Pressable>
          </View>

          {/* Balance Amount */}
          <Animated.View style={balanceAnimatedStyle}>
            <Text style={styles.balance}>
              {currency}
              {formatBalance(balance)}
            </Text>
          </Animated.View>

          {/* Trend Indicator */}
          {trend !== 0 && (
            <View style={styles.trendContainer}>
              <View
                style={[
                  styles.trendBadge,
                  { backgroundColor: trend > 0 ? 'rgba(125, 211, 160, 0.2)' : 'rgba(232, 154, 154, 0.2)' },
                ]}
              >
                <TrendingUp
                  size={14}
                  color={trend > 0 ? colors.successLight : colors.errorLight}
                  strokeWidth={2.5}
                  style={trend < 0 && { transform: [{ rotate: '180deg' }] }}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trend > 0 ? colors.successLight : colors.errorLight },
                  ]}
                >
                  {Math.abs(trend)}% this month
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    ...shadows.lg,
    borderRadius: radii.card,
    marginBottom: spacing.xl,
  },
  container: {
    borderRadius: radii.card,
    padding: spacing.xl,
    minHeight: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  label: {
    ...(typography.bodySmall as any),
    fontSize: 14,
    fontWeight: '600',
  },
  balance: {
    ...(typography.h1 as any),
    marginVertical: spacing.m,
  },
  trendContainer: {
    marginTop: spacing.s,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
  },
  trendText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    fontWeight: '600',
  },
});
