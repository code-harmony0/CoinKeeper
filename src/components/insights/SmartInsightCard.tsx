import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShieldAlert, Info, AlertTriangle, TrendingDown } from 'lucide-react-native';
import type { Insight } from '../../services/insightsEngine';

interface SmartInsightCardProps {
  insight: Insight;
  delay?: number;
}

export const SmartInsightCard: React.FC<SmartInsightCardProps> = ({ insight, delay = 0 }) => {
  const { colors, cardRadius, cardShadow, iconShadow, space } = useSpecTheme();

  let icon;
  let bgTint;
  let fgTint;

  switch (insight.type) {
    case 'alert':
      icon = <ShieldAlert size={20} color={colors.danger} />;
      bgTint = 'rgba(255,59,48,0.1)';
      fgTint = colors.danger;
      break;
    case 'warning':
      icon = <AlertTriangle size={20} color={colors.peachDeep} />;
      bgTint = 'rgba(255,149,0,0.1)';
      fgTint = colors.peachDeep;
      break;
    case 'success':
      icon = <TrendingDown size={20} color={colors.success} />;
      bgTint = 'rgba(52,199,89,0.1)';
      fgTint = colors.success;
      break;
    case 'info':
    default:
      icon = <Info size={20} color={colors.primaryAccent} />;
      bgTint = 'rgba(0,122,255,0.1)';
      fgTint = colors.primaryAccent;
      break;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: space.sm }, cardShadow]}>
      <View style={[styles.header, { marginBottom: space.xs }]}>
        <View style={[styles.titleRow, { gap: space.xs }]}>
          <View style={[styles.iconBox, { backgroundColor: bgTint }, iconShadow]}>{icon}</View>
          <Text variant="h3" style={[styles.title, { color: colors.textPrimary }]}>
            {insight.title}
          </Text>
        </View>
        {insight.value && (
          <Text variant="h3" style={{ color: fgTint }}>{insight.value}</Text>
        )}
      </View>
      {/* Explicit specTheme color: ui/Text's `color="secondary"` resolves to
          useTheme()'s indigo #5856D6, not the gray body tone this needs. */}
      <Text variant="caption" style={[styles.message, { color: colors.textSecondary }]}>
        {insight.message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
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
