import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { computePresetOutcome } from '../../services/moneyPlanIntelligence';
import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';

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
    ? { label: 'SAVED & ACTIVE', bg: colors.textPrimary, fg: colors.background, check: true, outline: false }
    : isPending
    ? { label: 'DRAFT SELECTED', bg: colors.primaryAccent, fg: '#FFFFFF', check: true, outline: false }
    : isSavedButChanged
    ? { label: 'PREVIOUSLY SAVED', bg: 'transparent', fg: colors.textSecondary, check: false, outline: true }
    : isRecommended
    ? { label: 'BEST FIT', bg: colors.textSecondary, fg: '#FFFFFF', check: false, outline: false }
    : null;

  const monthlySavingsFormatted = income > 0
    ? `${Money.format(outcome.monthlySavings, { zeroDecimals: true })}/mo`
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
                  borderColor: isActive ? colors.textPrimary : colors.primaryAccent,
                  ...cardShadow,
                }
              : isSavedButChanged
              ? { borderWidth: 1.5, borderColor: `${colors.textPrimary}33`, ...cardShadow }
              : isRecommended
              ? { borderWidth: 1.5, borderColor: `${colors.textSecondary}33`, ...cardShadow }
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

        <View style={styles.checklist}>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              {income > 0 ? `Save ${Money.format(outcome.monthlySavings, { zeroDecimals: true })}/month` : `Save ${preset.s}%`}
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              {income > 0 ? `Safe Spend ${Money.format(outcome.safeToSpendToday, { zeroDecimals: true })}/day` : `Safe Spend limit`}
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              {efMonths ? `Emergency Fund in ${efMonths} months` : 'No E-Fund progress'}
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              Budget Health {outcome.grade}
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              Cash Flow Stable
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              Bills Covered
            </Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={12} color={iconFgColor} />
            <Text style={[styles.checkText, { color: colors.textPrimary }]} numberOfLines={1}>
              Financial Stress Low
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 200,
    padding: 16,
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
  checklist: {
    gap: 6,
    marginTop: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    flex: 1,
  },
});
