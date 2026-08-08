import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { THEME_TYPOGRAPHY, THEME_SPACING } from '../../theme/blobTheme';
import { getDb } from '../../store/database';
import { IncomePrediction } from '../../types/income';
import { Money } from '../../utils/money';
import * as Icons from 'lucide-react-native';

export const NextSalaryWidget = () => {
  const { colors, cardRadius, chipRadius, cardShadow, iconShadow } = useSpecTheme();
  const typography = THEME_TYPOGRAPHY;
  const spacing = THEME_SPACING;
  const [prediction, setPrediction] = useState<IncomePrediction | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      const db = getDb();
      // Get the largest upcoming predicted income
      const result = await db.execute(
        `SELECT * FROM income_predictions 
         WHERE predicted_date > datetime('now') 
         ORDER BY predicted_amount_paise DESC LIMIT 1`
      );
      if (result.rows && result.rows.length > 0) {
        setPrediction(result.rows[0] as any as IncomePrediction);
      }
    };
    fetchPrediction();
  }, []);

  if (!prediction) return null;

  const amount = Money.format(prediction.predicted_amount_paise, { zeroDecimals: true });
  const date = new Date(prediction.predicted_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: cardRadius, padding: spacing.lg }, cardShadow]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.chipBg }, iconShadow]}>
          <Icons.Calendar color={colors.textSecondary} size={20} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>Next Expected Income</Text>
      </View>
      <View style={styles.content}>
        <Text style={[typography.h2, { color: colors.success }]}>{amount}</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Expected around {date}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.surfaceSunken, borderRadius: chipRadius }]}>
        <Text style={[typography.label, { color: colors.primaryAccent }]}>{prediction.confidence_score}% Confidence</Text>
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
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  }
});
