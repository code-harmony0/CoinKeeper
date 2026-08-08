import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { THEME_TYPOGRAPHY, THEME_SPACING } from '../../theme/blobTheme';
import { getDb } from '../../store/database';
import { NOT_ENOUGH_DATA } from '../../services/income/IncomeAnalyticsService';
import * as Icons from 'lucide-react-native';

/** Plain-language reading of the weakest measurable factor. */
const diagnose = (
  stability: number,
  diversity: number,
  growth: number,
): string => {
  const measured = [
    { key: 'stability', score: stability },
    { key: 'diversity', score: diversity },
    { key: 'growth', score: growth },
  ].filter(f => f.score !== NOT_ENOUGH_DATA);

  if (measured.length === 0) return 'Add a few months of income to score this.';

  const weakest = measured.reduce((a, b) => (b.score < a.score ? b : a));
  if (weakest.score >= 70) return 'Your income is steady, spread, and growing.';

  switch (weakest.key) {
    case 'stability':
      return 'Your income amounts swing month to month, so plan against your lowest month, not your average.';
    case 'diversity':
      return 'Almost all of your income comes from one source — a second one would cushion a gap.';
    default:
      return 'Your income is trending down against the previous quarter.';
  }
};

export const IncomeHealthWidget = () => {
  const { colors, cardRadius, cardShadow, iconShadow } = useSpecTheme();
  const typography = THEME_TYPOGRAPHY;
  const spacing = THEME_SPACING;
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      const db = getDb();
      const result = await db.execute(
        `SELECT * FROM income_health_cache ORDER BY date DESC LIMIT 1`
      );
      if (result.rows && result.rows.length > 0) {
        setHealth(result.rows[0]);
      }
    };
    fetchHealth();
  }, []);

  if (!health || health.overall_score === NOT_ENOUGH_DATA) return null;

  const scoreColor =
    health.overall_score > 80
      ? colors.success
      : health.overall_score > 50
        ? colors.peachDeep
        : colors.danger;

  const metrics = [
    { label: 'Stability', score: health.stability_score },
    { label: 'Diversity', score: health.diversity_score },
    { label: 'Growth', score: health.growth_score },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: spacing.lg }, cardShadow]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.chipBg }, iconShadow]}>
          <Icons.Activity color={colors.textSecondary} size={20} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Income Health</Text>
      </View>

      <View style={styles.scoreContainer}>
        <Text style={[typography.h1, { color: scoreColor, fontSize: 48 }]}>{health.overall_score}</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>/ 100</Text>
      </View>

      <Text style={[typography.bodySmall, styles.diagnosis, { color: colors.textSecondary }]}>
        {diagnose(
          health.stability_score,
          health.diversity_score,
          health.growth_score,
        )}
      </Text>

      <View style={styles.metricsGrid}>
        {metrics.map(m => (
          <View key={m.label} style={styles.metric}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>{m.label}</Text>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {m.score === NOT_ENOUGH_DATA ? '—' : m.score}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginBottom removed for bento box gap layout
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  diagnosis: {
    lineHeight: 19,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  }
});
