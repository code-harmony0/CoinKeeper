import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { THEME_TYPOGRAPHY, THEME_SPACING } from '../../theme/blobTheme';
import { getDb } from '../../store/database';
import { IncomeInsight } from '../../types/income';
import * as Icons from 'lucide-react-native';

export const IncomeInsightsWidget = () => {
  const { colors, cardRadius } = useSpecTheme();
  const typography = THEME_TYPOGRAPHY;
  const spacing = THEME_SPACING;
  const [insights, setInsights] = useState<IncomeInsight[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      const db = getDb();
      const result = await db.execute(
        `SELECT * FROM income_insights_cache ORDER BY created_at DESC LIMIT 3`
      );
      if (result.rows) {
        setInsights(result.rows as any as IncomeInsight[]);
      }
    };
    fetchInsights();
  }, []);

  if (insights.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: spacing.lg }]}>
      <View style={styles.header}>
        <Icons.Sparkles color={colors.primaryAccent} size={20} />
        <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Income AI Insights</Text>
      </View>
      
      <View style={styles.list}>
        {insights.map((insight) => {
          const iconColor = insight.severity === 'success' ? colors.success : 
                            insight.severity === 'warning' ? colors.danger : 
                            insight.severity === 'danger' ? colors.danger : colors.primaryAccent;
          return (
            <View key={insight.id} style={styles.insightRow}>
              <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Icons.TrendingUp color={iconColor} size={16} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '500' }]}>{insight.title}</Text>
                <Text style={[typography.label, { color: colors.textSecondary }]}>{insight.description}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  }
});
