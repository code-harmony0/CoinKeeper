/**
 * BudgetDonut Component
 * Animated donut chart showing budget progress
 * Features: SVG animation, gradient fills, percentage display
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/designTokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BudgetDonutProps {
  spent: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export const BudgetDonut: React.FC<BudgetDonutProps> = ({
  spent,
  total,
  size = 140,
  strokeWidth = 14,
}) => {
  const progress = useSharedValue(0);
  const percentage = Math.min((spent / total) * 100, 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [percentage]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.primaryLight} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.pillBackground}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress Circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#donutGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <Text style={styles.spentAmount}>₹{spent.toLocaleString('en-IN')}</Text>
        <Text style={styles.totalLabel}>of ₹{total.toLocaleString('en-IN')}</Text>
        <Text style={styles.percentage}>{percentage.toFixed(0)}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  spentAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    lineHeight: 26,
    color: colors.textTitle,
    marginBottom: 2,
  },
  totalLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginBottom: 4,
  },
  percentage: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
  },
});
