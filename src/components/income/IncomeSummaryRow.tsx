/**
 * IncomeSummaryRow — home's one-line stand-in for income intelligence.
 *
 * Replaces three self-nulling cards with a single row that always renders
 * something true: either a summary of what's known, or a prompt to add the
 * income that would make it knowable.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet, ChevronRight } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { getDb } from '../../store/database';
import { NOT_ENOUGH_DATA } from '../../services/income/IncomeAnalyticsService';

interface IncomeSummaryRowProps {
  hasIncome: boolean;
  onOpenDetail: () => void;
  onAddIncome: () => void;
}

export const IncomeSummaryRow: React.FC<IncomeSummaryRowProps> = ({
  hasIncome,
  onOpenDetail,
  onAddIncome,
}) => {
  const { colors, cardRadius, cardShadow, iconShadow } = useSpecTheme();
  const st = makeStyles(colors, cardRadius);
  const [score, setScore] = useState<number | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(null);

  useEffect(() => {
    if (!hasIncome) return;
    let cancelled = false;

    const load = async () => {
      const db = getDb();
      const [health, prediction] = await Promise.all([
        db.execute(
          `SELECT overall_score FROM income_health_cache ORDER BY date DESC LIMIT 1`,
        ),
        db.execute(
          `SELECT predicted_date FROM income_predictions
            WHERE predicted_date > datetime('now')
            ORDER BY predicted_amount_paise DESC LIMIT 1`,
        ),
      ]);
      if (cancelled) return;

      const overall = (health.rows as any)?.[0]?.overall_score;
      setScore(
        typeof overall === 'number' && overall !== NOT_ENOUGH_DATA
          ? overall
          : null,
      );

      const predicted = (prediction.rows as any)?.[0]?.predicted_date;
      setNextDate(
        predicted
          ? new Date(predicted).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : null,
      );
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hasIncome]);

  // Only state the halves that are actually known.
  const parts: string[] = [];
  if (score !== null) parts.push(`Health ${score}/100`);
  if (nextDate) parts.push(`next ${nextDate}`);

  const supporting = hasIncome
    ? parts.length > 0
      ? parts.join(' · ')
      : 'Building your income picture'
    : 'Add your income to unlock predictions';

  return (
    <PressableScale
      onPress={hasIncome ? onOpenDetail : onAddIncome}
      style={[st.row, cardShadow]}
      accessibilityRole="button"
      accessibilityLabel={hasIncome ? 'Income details' : 'Add income'}
    >
      <View style={[st.icon, iconShadow]}>
        <Wallet size={20} color={colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={st.textCol}>
        <Text style={st.title}>Income</Text>
        <Text style={st.supporting} numberOfLines={1}>
          {supporting}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.2} />
    </PressableScale>
  );
};

const makeStyles = (colors: any, cardRadius: number) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 16,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: { flex: 1 },
    title: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    supporting: {
      fontSize: 14,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

export default IncomeSummaryRow;
