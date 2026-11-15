import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';
import {
  averageRakat,
  dailyEffort,
  formatDuration,
  paceChoices,
  paceOptions,
  projectedFinish,
  targetPlans,
  totalRakat,
} from '../../services/kazaInsights';

interface Props {
  visible: boolean;
  pending: number;
  prayers: { name: string; pending: number }[];
  prayersPerDay: number;
  currentGoal: number;
  /** Prayers a day over the last 7 days, 0 if none. */
  recentAverage: number;
  onClose: () => void;
  onPick: (perDay: number) => void;
}

const describe = (perDay: number, prayersPerDay: number): string => {
  if (perDay === 1) return 'A gentle start';
  if (perDay === prayersPerDay) return 'One after each prayer';
  return `${perDay / prayersPerDay} after each prayer`;
};

const monthYear = (date: Date): string =>
  date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

/** Pick a pace by seeing where it lands — the finish date does the motivating. */
export const KazaPlanSheet: React.FC<Props> = ({
  visible,
  pending,
  prayers,
  prayersPerDay,
  currentGoal,
  recentAverage,
  onClose,
  onPick,
}) => {
  const { colors } = useKazaTheme();
  const options = useMemo(
    () => paceOptions(pending, paceChoices(prayersPerDay)),
    [pending, prayersPerDay],
  );
  const plans = useMemo(() => targetPlans(pending), [pending]);
  const avgRakat = useMemo(() => averageRakat(prayers.map(p => p.name)), [prayers]);
  const recentFinish = projectedFinish(pending, recentAverage);

  return (
    <KazaSheet visible={visible} title="Choose your pace" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.sectionLabel }]}>
          Common Hanafi guidance: pray today's prayers on time, add one make-up beside each, then increase as you can.
        </Text>
        <Text style={[styles.total, { color: colors.textPrimary }]}>
          {`≈ ${totalRakat(prayers).toLocaleString('en-IN')} rakat in all`}
        </Text>

        {pending === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Nothing left to make up. Alhamdulillah.
          </Text>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.sectionLabel }]}>PICK A PACE</Text>
            {options.map(option => {
              const selected = option.perDay === currentGoal;
              const days = Math.ceil(pending / option.perDay);
              const effort = dailyEffort(option.perDay, avgRakat);
              const sub = selected ? colors.onAccent : colors.textSecondary;
              return (
                <PressableScale
                  key={option.perDay}
                  onPress={() => onPick(option.perDay)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.option,
                    { backgroundColor: selected ? colors.primaryAccent : colors.card },
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.perDay, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                      {option.perDay} a day
                    </Text>
                    <Text style={[styles.optionSub, { color: sub }]}>
                      {describe(option.perDay, prayersPerDay)}
                    </Text>
                    <Text style={[styles.optionSub, { color: sub }]}>
                      {`≈ ${effort.rakat} rakat · about ${effort.minutes} min a day`}
                    </Text>
                  </View>
                  <View style={styles.optionRight}>
                    <Text style={[styles.finish, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                      {option.finishOn ? monthYear(option.finishOn) : '—'}
                    </Text>
                    <Text style={[styles.optionSub, { color: sub }]}>{formatDuration(days)}</Text>
                  </View>
                  {selected && <Check size={18} color={colors.onAccent} strokeWidth={2.4} />}
                </PressableScale>
              );
            })}

            <Text style={[styles.label, { color: colors.sectionLabel }]}>OR FINISH BY…</Text>
            {plans.map(plan => {
              const selected = plan.perDay === currentGoal;
              const sub = selected ? colors.onAccent : colors.textSecondary;
              return (
                <PressableScale
                  key={plan.label}
                  onPress={() => onPick(plan.perDay)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.option,
                    { backgroundColor: selected ? colors.primaryAccent : colors.card },
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.perDay, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.optionSub, { color: sub }]}>{`${plan.perDay} a day`}</Text>
                  </View>
                  <Text style={[styles.finish, { color: selected ? colors.onAccent : colors.textPrimary }]}>
                    {monthYear(plan.finishOn)}
                  </Text>
                  {selected && <Check size={18} color={colors.onAccent} strokeWidth={2.4} />}
                </PressableScale>
              );
            })}

            {recentFinish && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardText, { color: colors.textPrimary }]}>
                  {`At your recent pace (${recentAverage} a day) you'd finish in ${monthYear(recentFinish)}`}
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={[styles.footnote, { color: colors.sectionLabel }]}>
          Time is a rough estimate (about 1.5 min per rakat). Dates assume you keep this pace every day.
        </Text>
      </ScrollView>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  intro: { fontSize: 14, fontFamily: 'Satoshi-Regular', lineHeight: 20, marginBottom: 8 },
  total: { fontSize: 14, fontFamily: 'Satoshi-Bold', marginBottom: 16 },
  empty: { fontSize: 15, fontFamily: 'Satoshi-Regular', textAlign: 'center', marginVertical: 24 },
  label: { fontSize: 11, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  optionText: { flex: 1 },
  optionRight: { alignItems: 'flex-end' },
  perDay: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  optionSub: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 2 },
  finish: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  card: { borderRadius: 16, padding: 16, marginTop: 8 },
  cardText: { fontSize: 14, fontFamily: 'Satoshi-Medium', lineHeight: 20 },
  footnote: { fontSize: 12, fontFamily: 'Satoshi-Regular', lineHeight: 17, marginTop: 16, marginBottom: 8 },
});
