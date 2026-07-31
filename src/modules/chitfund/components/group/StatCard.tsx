/**
 * StatCard Component
 * Displays a metric with icon and optional trend
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LucideIcon } from 'lucide-react-native';
import { theme } from '../../../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBackgroundColor?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = theme.colors.textPrimary,
  iconBackgroundColor = '#F5F5F5',
  trend,
  index = 0,
}) => {
  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return '#2E7D32';
      case 'down':
        return '#D32F2F';
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .springify()
        .damping(16)
        .stiffness(140)}
      style={styles.card}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        <Icon size={24} color={iconColor} strokeWidth={2.5} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {trend && (
          <Text style={[styles.trend, { color: getTrendColor() }]}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '–'}{' '}
            {trend.value}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.soft,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: theme.fonts.size.xxl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  trend: {
    fontSize: theme.fonts.size.xs,
    fontWeight: '600',
    marginTop: 2,
  },
});
