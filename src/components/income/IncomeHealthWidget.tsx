import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { THEME_TYPOGRAPHY, THEME_SPACING } from '../../theme/blobTheme';
import { getDb } from '../../store/database';
import * as Icons from 'lucide-react-native';

export const IncomeHealthWidget = () => {
  const { colors, cardRadius } = useSpecTheme();
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

  if (!health) return null;

  const scoreColor = health.overall_score > 80 ? colors.success : health.overall_score > 50 ? colors.danger : colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: spacing.lg }]}>
      <View style={styles.header}>
        <Icons.Activity color={colors.primaryAccent} size={20} />
        <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Income Health</Text>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={[typography.h1, { color: scoreColor, fontSize: 48 }]}>{health.overall_score}</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>/ 100</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metric}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Stability</Text>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{health.stability_score}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Diversity</Text>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{health.diversity_score}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>Growth</Text>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{health.growth_score}</Text>
        </View>
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
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  }
});
