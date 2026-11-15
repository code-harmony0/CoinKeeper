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
import { brand, useSpecTheme } from '../../theme/specTheme';
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
  const { colors, cardRadius, isDark } = useSpecTheme();
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
  if (score !== null) parts.push(`${score} out of 100`);
  if (nextDate) parts.push(`next ${nextDate}`);

  // A score alone means little: give it a word, and flag weak in yellow.
  const status = score === null ? null : score < 40 ? 'LOW' : score < 70 ? 'FAIR' : 'STRONG';
  const supporting = hasIncome
    ? parts.length > 0
      ? parts.join(' · ')
      : 'Building your income picture'
    : 'Add your income to unlock predictions';

  return (
    <PressableScale
      onPress={hasIncome ? onOpenDetail : onAddIncome}
      style={st.row}
      accessibilityRole="button"
      accessibilityLabel={hasIncome ? 'Income details' : 'Add income'}
    >
      <View style={[st.icon, isDark && { backgroundColor: colors.chipBg }]}>
        <Wallet size={20} color="#FFFFFF" strokeWidth={1.7} />
      </View>
      <View style={st.textCol}>
        {status && (
          <View style={[st.tag, status !== 'LOW' && st.tagQuiet]}>
            <Text style={[st.tagText, status !== 'LOW' && { color: colors.textPrimary }]}>{status}</Text>
          </View>
        )}
        <Text style={st.supporting} numberOfLines={1}>
          {supporting}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} strokeWidth={1.7} />
    </PressableScale>
  );
};

const makeStyles = (colors: any, _cardRadius: number) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 72,
    },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: brand.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: { flex: 1, gap: 2 },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: brand.alert,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    tagQuiet: { backgroundColor: colors.chipBg },
    tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Black', color: brand.ink, letterSpacing: 0.5 },
    supporting: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
  });

export default IncomeSummaryRow;
