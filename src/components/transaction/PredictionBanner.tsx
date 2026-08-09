import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { Sparkles, CheckCircle2, ShieldAlert, AlertTriangle, Repeat } from 'lucide-react-native';

interface Props {
  category?: string | null;
  confidence?: number;
  exceedsBudget?: boolean;
  budgetUsagePercent?: number;
  isDuplicate?: boolean;
  isRecurring?: boolean;
  /** manual: category + budget only. inbox: adds confidence/duplicate/recurring badges (SMS/scan). */
  variant: 'manual' | 'inbox';
}

export const PredictionBanner: React.FC<Props> = ({
  category,
  confidence = 0,
  exceedsBudget,
  budgetUsagePercent,
  isDuplicate,
  isRecurring,
  variant,
}) => {
  const { colors, cardRadius } = useSpecTheme();
  const warning = (colors as any).warning || '#F59E0B';

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
          <Text style={[styles.title, { color: colors.primaryAccent }]}>
            {variant === 'manual' ? 'AI Assistant' : 'Confidence'}
          </Text>
        </View>
        {variant === 'inbox' && (
          <Text style={[styles.confidence, { color: confidence >= 80 ? colors.success : warning }]}>
            {confidence}%
          </Text>
        )}
      </View>

      <View style={styles.body}>
        {category ? (
          <Text style={[styles.predictionText, { color: colors.textPrimary }]}>
            Looks like <Text style={{ color: colors.primaryAccent }}>{category}</Text>
          </Text>
        ) : (
          <Text style={[styles.predictionText, { color: colors.textSecondary }]}>
            Choose a category
          </Text>
        )}

        {budgetUsagePercent !== undefined && (
          <>
            <View style={styles.budgetRow}>
              {exceedsBudget ? (
                <ShieldAlert size={16} color={warning} />
              ) : (
                <CheckCircle2 size={16} color={colors.success} />
              )}
              <Text style={[styles.budgetText, { color: exceedsBudget ? warning : colors.success }]}>
                {exceedsBudget ? 'Exceeds monthly budget' : 'Within Budget'}
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.chipBg }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: exceedsBudget ? warning : colors.success, width: `${Math.min(budgetUsagePercent, 100)}%` },
                ]}
              />
            </View>
          </>
        )}

        {(isDuplicate || isRecurring) && (
          <View style={styles.badgeRow}>
            {isDuplicate && (
              <View style={[styles.badge, { backgroundColor: colors.danger + '20' }]}>
                <AlertTriangle size={12} color={colors.danger} />
                <Text style={[styles.badgeText, { color: colors.danger }]}>Possible duplicate</Text>
              </View>
            )}
            {isRecurring && (
              <View style={[styles.badge, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Repeat size={12} color={colors.primaryAccent} />
                <Text style={[styles.badgeText, { color: colors.primaryAccent }]}>Looks recurring</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, marginVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: 'Satoshi-Bold', fontSize: 13, letterSpacing: 0.5 },
  confidence: { fontFamily: 'Satoshi-Bold', fontSize: 13 },
  body: { gap: 8 },
  predictionText: { fontFamily: 'Satoshi-Black', fontSize: 18 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  budgetText: { fontFamily: 'Satoshi-Bold', fontSize: 14 },
  progressBarBg: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontFamily: 'Satoshi-Bold', fontSize: 12 },
});
