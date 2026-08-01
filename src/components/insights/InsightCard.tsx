import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { FinancialInsight } from '../../services/InsightEngine';
import { PressableScale } from '../anim';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
  insight: FinancialInsight;
  index: number;
}

export const InsightCard: React.FC<Props> = ({ insight, index }) => {
  const { colors, cardRadius } = useSpecTheme();
  const navigation = useNavigation<any>();

  let Icon = Lightbulb;
  let tint = colors.primaryAccent;

  if (insight.type === 'warning' || insight.severity === 'high') {
    Icon = AlertCircle;
    tint = colors.danger;
  } else if (insight.type === 'anomaly') {
    Icon = TrendingUp;
    tint = '#F5A623';
  } else if (insight.type === 'milestone' || insight.type === 'health') {
    Icon = CheckCircle;
    tint = colors.success;
  }

  return (
    <Animated.View entering={FadeInUp.delay(index * 100)}>
      <PressableScale 
        onPress={() => insight.actionRoute && navigation.navigate(insight.actionRoute)}
        style={[styles.card, { backgroundColor: tint + '15', borderRadius: cardRadius }]}
      >
        <View style={styles.header}>
          <Icon size={20} color={tint} />
          <Text style={[styles.title, { color: tint }]}>{insight.title}</Text>
        </View>
        <Text style={[styles.desc, { color: colors.textPrimary }]}>{insight.description}</Text>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
  desc: { fontSize: 14, fontFamily: 'Satoshi-Medium', lineHeight: 20 }
});
