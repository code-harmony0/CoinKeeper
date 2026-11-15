/**
 * InsightPillRail — the scrollable facts under the hero.
 *
 * A rail rather than a stack because none of these is more important than the
 * next: they are peripheral vision for the month, and stacking them would give
 * whichever landed first an authority it hasn't earned. Each opens the screen
 * that can act on it.
 */
import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import type { InsightPill, PillTarget } from '../../services/homeNarrative';

const ICONS = { CalendarClock, TrendingDown, TrendingUp, Wallet };

interface Props {
  pills: InsightPill[];
  onPress: (target: PillTarget) => void;
}

export const InsightPillRail: React.FC<Props> = ({ pills, onPress }) => {
  const { colors, chipRadius } = useSpecTheme();

  if (pills.length === 0) return null;

  const toneColor = (tone: InsightPill['tone']) =>
    tone === 'good'
      ? colors.mintDeep
      : tone === 'warn'
        ? colors.peachDeep
        : tone === 'bad'
          ? colors.danger
          : colors.skyDeep;

  return (
    <Animated.View entering={FadeIn.delay(500)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        // The rail bleeds to the screen edge so the last chip is visibly cut
        // off — the clipped edge is what tells the user to scroll.
        style={styles.bleed}
      >
        {pills.map(pill => {
          const Icon = ICONS[pill.icon];
          const accent = toneColor(pill.tone);
          return (
            <PressableScale
              key={pill.id}
              onPress={() => onPress(pill.target)}
              accessibilityRole="button"
              accessibilityLabel={pill.label}
              style={[
                styles.pill,
                { backgroundColor: colors.card, borderRadius: chipRadius },
              ]}
            >
              <View style={styles.pillInner}>
                <Icon size={14} color={accent} strokeWidth={2.4} />
                <Text
                  style={[styles.pillText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {pill.label}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -24 },
  rail: { paddingHorizontal: 24, gap: 8 },
  pill: { paddingVertical: 10, paddingHorizontal: 14 },
  pillInner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillText: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
});

export default InsightPillRail;
