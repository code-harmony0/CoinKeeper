/**
 * WeeklyStoryCard — the week's story on the home screen.
 *
 * Sits below the hero deliberately. The hero answers "can I spend right now?"
 * and must win the first glance; this is the thing worth reading once you've
 * already got your answer, so it never competes for that glance — no ring, no
 * hero-scale number, one accent rule for tone instead of a filled surface.
 *
 * Renders nothing when `buildWeeklyStory` returns null. A card that says "you
 * spent ₹0 this week" on a week the user simply didn't log anything is worse
 * than no card, the same reason `IncomeHealthCard` hides itself before its
 * first score.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import type { WeeklyStory } from '../../services/weeklyStory';
import { IconTile } from '../shared/IconTile';

interface Props {
  story: WeeklyStory | null;
  onOpenReports: () => void;
}

export const WeeklyStoryCard: React.FC<Props> = ({ story, onOpenReports }) => {
  const { colors } = useSpecTheme();
  if (!story) return null;

  // Two lines at most: what happened, and what stood out. Joined so a short
  // story leaves no gap where a third line would have been.
  const body = [story.comparison, story.observation].filter(Boolean).join(' ');

  return (
    <PressableScale
      onPress={onOpenReports}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Your week. ${story.headline} ${body} Opens reports.`}
    >
      <IconTile icon={CalendarDays} />
      <View style={styles.text}>
        <Text style={[styles.headline, { color: colors.textPrimary }]}>{story.headline}</Text>
        {body.length > 0 && <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>}
      </View>
      <ChevronRight size={20} color={colors.textSecondary} strokeWidth={1.8} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingVertical: 8 },
  text: { flex: 1, gap: 2 },
  headline: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
});

export default WeeklyStoryCard;
