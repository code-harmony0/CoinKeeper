import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radii } from '../../theme/designTokens';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldAlert, Info, AlertTriangle, TrendingDown } from 'lucide-react-native';
import type { Insight } from '../../services/insightsEngine';

interface SmartInsightCardProps {
  insight: Insight;
  delay?: number;
}

export const SmartInsightCard: React.FC<SmartInsightCardProps> = ({ insight, delay = 0 }) => {
  const { colors } = useTheme();

  let icon;
  let bgTint;
  let fgTint;

  switch (insight.type) {
    case 'alert':
      icon = <ShieldAlert size={20} color={colors.error} />;
      bgTint = 'rgba(255,59,48,0.1)';
      fgTint = colors.error;
      break;
    case 'warning':
      icon = <AlertTriangle size={20} color={colors.warning} />;
      bgTint = 'rgba(255,149,0,0.1)';
      fgTint = colors.warning;
      break;
    case 'success':
      icon = <TrendingDown size={20} color={colors.success} />;
      bgTint = 'rgba(52,199,89,0.1)';
      fgTint = colors.success;
      break;
    case 'info':
    default:
      icon = <Info size={20} color={colors.primary} />;
      bgTint = 'rgba(0,122,255,0.1)';
      fgTint = colors.primary;
      break;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.text }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: bgTint }]}>{icon}</View>
          <Text variant="h2" style={styles.title}>{insight.title}</Text>
        </View>
        {insight.value && (
          <Text variant="h2" style={{ color: fgTint }}>{insight.value}</Text>
        )}
      </View>
      <Text variant="caption" color="secondary" style={styles.message}>
        {insight.message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    borderRadius: radii.card,
    elevation: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    marginBottom: spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  message: {
    lineHeight: 20,
  },
});
