import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { computePresetOutcome } from '../../services/moneyPlanIntelligence';
import { useSpecTheme } from '../../theme/specTheme';

interface Preset {
  id: string;
  name: string;
  n: number;
  w: number;
  s: number;
  icon: React.ReactNode;
  recommended?: boolean;
  /** Outcome story promise shown on the card. */
  outcomeStory: string;
}

interface Props {
  preset: Preset;
  income: number;
  onSelect: (n: number, w: number, s: number) => void;
  colors: any;
  cardRadius: number;
  /** The id of the plan that is currently saved in DB */
  activePlanId: string | null;
  /**
   * The id of the preset matching the current *unsaved* draft. Distinct from
   * activePlanId: this changes the instant a card is tapped, so the card can
   * confirm the tap before the plan is ever persisted.
   */
  selectedPlanId: string | null;
  /** Icon background color for this specific card */
  iconBgColor: string;
  iconFgColor: string;
}

export const LifestyleProfileCard: React.FC<Props> = ({
  preset,
  income,
  onSelect,
  colors,
  cardRadius,
  activePlanId,
  selectedPlanId,
  iconBgColor,
  iconFgColor,
}) => {
  const { cardShadow, iconShadow } = useSpecTheme();
  const outcome = computePresetOutcome({
    income,
    needsPercent: preset.n,
    wantsPercent: preset.w,
    savingsPercent: preset.s,
  });

  // Three distinct, simultaneous truths:
  //   isSelected  — matches the draft the user is looking at right now
  //   isActive    — matches the plan persisted in the DB
  //   isPending   — selected but not yet locked in (the "about to apply" state)
  // A card can be selected-and-active (nothing to save), selected-only
  // (pending change), or active-only (still saved, user has moved away).
  const isSelected = selectedPlanId === preset.id;
  const isActive = activePlanId === preset.id;
  const isPending = isSelected && !isActive;
  const isSavedButChanged = isActive && !isSelected;
  const isRecommended = !!preset.recommended;

  // Lift on selection, not on save — the tap is what needs acknowledging.
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isSelected ? 1.02 : 1, { damping: 18, stiffness: 140 }) },
    ],
  }));

  // Exactly one badge, by priority. Ordering matters: a pending change must
  // outrank "best fit", or the card the user just tapped stays unacknowledged.
  const badge = isSelected && isActive
    ? { label: 'ACTIVE', bg: colors.textPrimary, fg: '#FFFFFF', check: true, outline: false }
    : isPending
    ? { label: 'SELECTED', bg: iconFgColor, fg: '#FFFFFF', check: true, outline: false }
    : isSavedButChanged
    ? { label: 'CURRENT', bg: 'transparent', fg: colors.textSecondary, check: false, outline: true }
    : isRecommended
    ? { label: 'BEST FIT', bg: iconFgColor, fg: '#FFFFFF', check: false, outline: false }
    : null;

  const monthlySavingsFormatted = income > 0
    ? `₹${outcome.monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo`
    : `${preset.s}% saved`;

  const efMonths = outcome.emergencyFundMonths;

  return (
    <Animated.View style={animStyle}>
      <PressableScale
        onPress={() => onSelect(preset.n, preset.w, preset.s)}
        style={[
          styles.card,
          {
            // Always opaque. A translucent card background combined with
            // cardShadow's elevation lets Android render the shadow through the
            // fill, greying out the card.
            backgroundColor: colors.card,
            borderRadius: cardRadius,
            // Selected reads loudest: 2px in the plan's own accent, or the dark
            // primary once it's the saved plan. The still-saved card keeps a
            // muted outline so the before/after swap is legible at a glance.
            ...(isSelected
              ? {
                  borderWidth: 2,
                  borderColor: isActive ? colors.textPrimary : iconFgColor,
                  ...cardShadow,
                }
              : isSavedButChanged
              ? { borderWidth: 1.5, borderColor: `${colors.textPrimary}33`, ...cardShadow }
              : isRecommended
              ? { borderWidth: 1.5, borderColor: `${iconFgColor}50`, ...cardShadow }
              : cardShadow),
          },
        ]}
      >
        {/* Status badge — one at a time, resolved by priority above */}
        {badge && (
          <Animated.View
            key={badge.label}
            entering={FadeIn.duration(180)}
            style={[
              styles.badge,
              {
                backgroundColor: badge.bg,
                ...(badge.outline
                  ? { borderWidth: 1, borderColor: colors.border }
                  : null),
              },
            ]}
          >
            {badge.check && <CheckCircle2 color={badge.fg} size={10} strokeWidth={2.5} />}
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </Animated.View>
        )}

        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: iconBgColor },
            iconShadow,
          ]}
        >
          {preset.icon}
        </View>

        {/* Name */}
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {preset.name}
        </Text>

        {/* Primary outcome — THIS is what users buy */}
        <Text
          style={[styles.savingsHeadline, { color: iconFgColor }]}
        >
          {monthlySavingsFormatted}
        </Text>

        {/* Outcome story */}
        <Text
          variant="caption"
          style={[styles.story, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {preset.outcomeStory}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Supporting stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text variant="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>
              Spend
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {income > 0
                ? `₹${outcome.safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : `${preset.n + preset.w}%`}
            </Text>
          </View>
          <View style={styles.statBlock}>
            <Text variant="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>
              E-Fund
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {efMonths ? `${efMonths} mo` : '—'}
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 164,
    padding: 18,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontFamily: 'Satoshi-Black',
    fontSize: 15,
    marginBottom: 4,
  },
  savingsHeadline: {
    fontFamily: 'Satoshi-Black',
    fontSize: 17,
    marginBottom: 4,
  },
  story: {
    lineHeight: 16,
    marginBottom: 14,
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Satoshi-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
});
