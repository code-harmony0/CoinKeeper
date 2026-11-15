import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, ChevronRight, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';
import { FinancialInsight } from '../../services/InsightEngine';
import { PressableScale } from '../anim';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
  insight: FinancialInsight;
  index: number;
  /** Replaces navigating to `actionRoute`, for insights the screen acts on itself. */
  onPress?: () => void;
  children?: React.ReactNode;
}

/**
 * One insight as a flat row: icon tile, a plain title, one sentence. Only
 * warnings take the alert colour (it means "needs action"); everything else is
 * the same black tile as the rest of the app.
 */
export const InsightCard: React.FC<Props> = ({ insight, index, onPress, children }) => {
  const { colors, isDark } = useSpecTheme();
  const navigation = useNavigation<any>();

  let Icon = Lightbulb;
  let alert = false;
  if (insight.type === 'warning' || insight.severity === 'high') {
    Icon = AlertCircle;
    alert = true;
  } else if (insight.type === 'anomaly') {
    Icon = TrendingUp;
  } else if (insight.type === 'milestone' || insight.type === 'health') {
    Icon = CheckCircle;
  }
  const opens = !!onPress || !!insight.actionRoute;

  return (
    <Animated.View entering={FadeInUp.delay(index * 80)}>
      <PressableScale
        onPress={onPress ?? (() => insight.actionRoute && navigation.navigate(insight.actionRoute))}
        accessibilityRole={opens ? 'button' : 'text'}
        style={[styles.row, { borderBottomColor: colors.border }]}
      >
        <View style={styles.top}>
          <View style={[styles.tile, { backgroundColor: alert ? brand.alert : isDark ? colors.chipBg : brand.ink }]}>
            <Icon size={20} strokeWidth={1.7} color={alert ? brand.ink : '#FFFFFF'} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{insight.title}</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{insight.description}</Text>
          </View>
          {opens && <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.8} />}
        </View>
        {children}
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tile: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  desc: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});
