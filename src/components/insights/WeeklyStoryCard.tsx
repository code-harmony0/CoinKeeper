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
import type { Tone } from '../../services/homeNarrative';

interface Props {
  story: WeeklyStory | null;
  onOpenReports: () => void;
}

export const WeeklyStoryCard: React.FC<Props> = ({ story, onOpenReports }) => {
  const { colors, cardRadius, cardShadow } = useSpecTheme();

  if (!story) return null;

  const TONE_COLOR: Record<Tone, string> = {
    good: colors.success,
    warn: colors.warning,
    bad: colors.danger,
    neutral: colors.textSecondary,
  };
  const accent = TONE_COLOR[story.tone];
  const st = makeStyles(colors, cardRadius);

  // The lines the ledger could actually support — see buildWeeklyStory, which
  // drops rather than pads. Joined into one paragraph so a two-line story
  // doesn't leave a gap where a third line would have been.
  const body = [story.comparison, story.observation]
    .filter(Boolean)
    .join(' ');

  // No entrance animation of its own — the dashboard's `OnEnter` wrapper owns
  // the stagger for this band, and two `entering` props on nested views fight
  // each other.
  return (
    <PressableScale
      onPress={onOpenReports}
      style={[st.card, cardShadow]}
      accessibilityRole="button"
      accessibilityLabel={`Your week. ${story.headline} ${body} Opens reports.`}
    >
      <View style={[st.rule, { backgroundColor: accent }]} />
      <View style={st.content}>
        <View style={st.header}>
          <CalendarDays size={14} color={colors.sectionLabel} strokeWidth={2.5} />
          <Text style={st.eyebrow}>YOUR WEEK</Text>
          <View style={st.spacer} />
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
        <Text style={st.headline}>{story.headline}</Text>
        {body.length > 0 && <Text style={st.body}>{body}</Text>}
      </View>
    </PressableScale>
  );
};

const makeStyles = (
  colors: ReturnType<typeof useSpecTheme>['colors'],
  cardRadius: number,
) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      overflow: 'hidden',
    },
    // A rule rather than a tinted card: tone is worth encoding, but not worth
    // a full coloured surface competing with the hero above it.
    rule: { width: 4 },
    content: { flex: 1, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.sectionLabel,
    },
    spacer: { flex: 1 },
    headline: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 10,
      lineHeight: 23,
    },
    body: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 4,
    },
  });

export default WeeklyStoryCard;
