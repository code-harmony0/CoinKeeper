import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react-native';

interface Props {
  predictedCategory: string;
  confidence: number;
  exceedsBudget?: boolean;
  budgetUsagePercent?: number;
}

export const AiAssistantCard: React.FC<Props> = ({
  predictedCategory,
  confidence,
  exceedsBudget,
  budgetUsagePercent
}) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <Animated.View 
      entering={FadeInUp.springify().damping(20).stiffness(200)} 
      exiting={FadeOutUp.duration(200)} 
      layout={Layout.springify()}
      style={[styles.container, { backgroundColor: colors.surfaceElevated, borderRadius: cardRadius, borderColor: colors.border, borderWidth: 1 }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={16} color={colors.primaryAccent} />
          <Text style={[styles.title, { color: colors.primaryAccent }]}>AI Assistant</Text>
        </View>
        <Text style={[styles.confidence, { color: colors.textSecondary }]}>{confidence}% confidence</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.predictionText, { color: colors.textPrimary }]}>
          Looks like <Text style={{ color: colors.primaryAccent }}>{predictedCategory}</Text>
        </Text>

        <View style={styles.budgetRow}>
          {exceedsBudget ? (
            <ShieldAlert size={16} color={(colors as any).warning || '#F59E0B'} />
          ) : (
            <CheckCircle2 size={16} color={colors.success} />
          )}
          <Text style={[
            styles.budgetText, 
            { color: exceedsBudget ? ((colors as any).warning || '#F59E0B') : colors.success }
          ]}>
            {exceedsBudget ? 'Exceeds monthly budget' : 'Within Budget'}
          </Text>
        </View>

        {budgetUsagePercent !== undefined && (
          <View style={[styles.progressBarBg, { backgroundColor: colors.chipBg }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: exceedsBudget ? ((colors as any).warning || '#F59E0B') : colors.success,
                  width: `${Math.min(budgetUsagePercent, 100)}%` 
                }
              ]} 
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidence: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  body: {
    gap: 8,
  },
  predictionText: {
    fontFamily: 'Satoshi-Black',
    fontSize: 18,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  budgetText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  }
});
