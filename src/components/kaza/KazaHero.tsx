import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { enamel, useSpecTheme } from '../../theme/specTheme';
import { KazaFill } from './KazaFill';
import { CountUp, PressableScale } from '../anim';
import type { ChapterProgress } from '../../services/kazaInsights';

interface Props {
  pending: number;
  completed: number;
  total: number;
  chapter: ChapterProgress;
  dailyGoal: number;
  finishOn: Date | null;
  onPlan: () => void;
}

// The hero sits on the same dark enamel panel as the home hero (DESIGN.md §7),
// so the one number that matters is the loudest thing on the screen.
const CREAM = enamel.textPrimary;
const CREAM_MUTED = enamel.textSecondary;
const CREAM_TRACK = 'rgba(255,255,255,0.16)';

/**
 * The number that matters, framed so progress is visible: the backlog is
 * split into one-year chapters, so a week of effort moves a bar you can see
 * instead of a ring that stays empty for months.
 */
export const KazaHero: React.FC<Props> = ({
  pending,
  chapter,
  dailyGoal,
  finishOn,
  onPlan,
}) => {
  const { cardRadius, cardShadow } = useSpecTheme();
  const ratio =
    chapter.chapterSize > 0 ? chapter.chapterDone / chapter.chapterSize : 0;
  // A sliver for any progress at all: the first step should never look like nothing.
  const fillPercent = chapter.chapterDone > 0 ? Math.max(ratio * 100, 2.5) : 0;
  const finished = pending === 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: enamel.background,
          borderRadius: cardRadius,
        },
        cardShadow,
      ]}
    >
      <Text style={[styles.label, { color: CREAM_MUTED }]}>
        {finished ? 'All made up. Alhamdulillah.' : 'Prayers left to make up'}
      </Text>
      <CountUp value={pending} style={[styles.number, { color: CREAM }]} />

      {!finished && (
        <View style={styles.chapterBlock}>
          <View style={styles.chapterRow}>
            <Text style={[styles.chapterTitle, { color: CREAM }]}>
              {chapter.chapters > 1
                ? `Year ${chapter.current} of ${chapter.chapters}`
                : 'Your progress'}
            </Text>
            <Text style={[styles.chapterCount, { color: CREAM_MUTED }]}>
              {chapter.chapterDone.toLocaleString('en-IN')} of{' '}
              {chapter.chapterSize.toLocaleString('en-IN')} days
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`Year ${chapter.current} of ${chapter.chapters}, ${chapter.chapterDone} of ${chapter.chapterSize} days made up`}
          >
            <KazaFill
              percent={fillPercent}
              color={CREAM}
              trackColor={CREAM_TRACK}
              height={8}
            />
          </View>
        </View>
      )}

      {!finished && (
        <PressableScale
          onPress={onPlan}
          accessibilityRole="button"
          style={[styles.planRow, { backgroundColor: CREAM_TRACK }]}
        >
          <Text style={[styles.planText, { color: CREAM }]}>
            {finishOn
              ? `At ${dailyGoal} a day · done by ${finishOn.toLocaleDateString(
                  'en-IN',
                  { month: 'short', year: 'numeric' },
                )}`
              : 'Set a pace to see a finish date'}
          </Text>
          <ChevronRight size={16} color={CREAM} strokeWidth={2} />
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 24 },
  label: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  number: { fontSize: 64, lineHeight: 72, fontFamily: 'Satoshi-Black' },
  chapterBlock: { marginTop: 16 },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  chapterTitle: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  chapterCount: { fontSize: 12, fontFamily: 'Satoshi-Regular' },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  planText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
});
