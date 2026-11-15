import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { Money } from '../../utils/money';
import {
  billStatus,
  billsSummary,
  upcomingBills,
} from '../../services/billSchedule';
import type { Bill } from '../../store/billStore';

interface Props {
  bills: Bill[];
  onOpenBills: () => void;
}

const MAX_ROWS = 5;

const when = (daysAway: number): string => {
  if (daysAway < 0) return `${-daysAway}d overdue`;
  if (daysAway === 0) return 'Due today';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
};

/** What is owed and when, soonest first, with one way into the full list. */
export const BillsPeek: React.FC<Props> = ({ bills, onOpenBills }) => {
  const { colors } = useSpecTheme();
  const summary = useMemo(() => billsSummary(bills), [bills]);
  // Overdue bills lead: the headline counts them, so the list must show them.
  const due = useMemo(() => {
    const open = bills.filter(b => billStatus(b) !== 'paid');
    const late = open
      .filter(b => billStatus(b) === 'overdue')
      .map(b => ({ name: b.name, amountPaise: b.amountPaise, daysAway: -1, overdue: true }));
    const rest = upcomingBills(open.filter(b => billStatus(b) !== 'overdue')).map(
      b => ({ ...b, overdue: false }),
    );
    return [...late, ...rest].slice(0, MAX_ROWS);
  }, [bills]);

  return (
    <View>
      <Text style={[styles.headline, { color: colors.textPrimary }]}>
        {summary.headline}
      </Text>

      {due.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {due.map((b, i) => {
            const late = b.overdue;
            return (
              <View
                key={`${b.name}-${i}`}
                style={[
                  styles.row,
                  i < due.length - 1 && {
                    borderBottomColor: colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.rowText}>
                  <Text
                    style={[styles.name, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  <Text
                    style={[
                      styles.when,
                      { color: late ? colors.danger : colors.textSecondary },
                    ]}
                  >
                    {late ? 'Overdue' : when(b.daysAway)}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: colors.textPrimary }]}>
                  {Money.format(b.amountPaise, { zeroDecimals: true })}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <PressableScale
        onPress={onOpenBills}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: colors.primaryAccent }]}
      >
        <Text style={[styles.ctaText, { color: colors.onAccent }]}>
          {bills.length === 0 ? 'Add a bill' : 'Open bills'}
        </Text>
        <ChevronRight size={18} color={colors.onAccent} strokeWidth={2.2} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  headline: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Satoshi-Bold',
    marginBottom: 16,
  },
  card: { borderRadius: 24, paddingHorizontal: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: 12 },
  rowText: { flex: 1 },
  name: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Medium' },
  when: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium' },
  amount: { fontSize: 16, fontFamily: 'Satoshi-Black' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 56,
    borderRadius: 999,
  },
  ctaText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
});
