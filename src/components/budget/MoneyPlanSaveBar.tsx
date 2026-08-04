import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ArrowDown, LockKeyhole } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  hasChanges: boolean;
  isBalanced: boolean;
  isLoading: boolean;
  safeToSpend: number;
  monthlySavings: number;
  previousSafeToSpend: number;
  previousMonthlySavings: number;
  onApply: () => void;
  colors: any;
  paddingBottom: number;
}

const fmt = (v: number) =>
  `₹${Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtDelta = (v: number) => `${v >= 0 ? '+' : '-'}${fmt(v)}`;

type DeltaSign = 'positive' | 'negative' | 'neutral';

const deltaSign = (v: number): DeltaSign =>
  v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';

export const MoneyPlanSaveBar: React.FC<Props> = ({
  hasChanges,
  isBalanced,
  isLoading,
  safeToSpend,
  monthlySavings,
  previousSafeToSpend,
  previousMonthlySavings,
  onApply,
  colors,
  paddingBottom,
}) => {
  const { cardShadow } = useSpecTheme();
  const savingsDelta = monthlySavings - previousMonthlySavings;
  const spendDelta = safeToSpend - previousSafeToSpend;

  const savingsSign = deltaSign(savingsDelta);
  const spendSign = deltaSign(spendDelta);

  const deltaColor = (sign: DeltaSign) =>
    sign === 'positive' ? colors.mintDeep : sign === 'negative' ? colors.danger : colors.textSecondary;

  const handleApply = () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onApply();
  };

  const btnDisabled = !isBalanced || isLoading;

  return (
    <>
      {hasChanges && (
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(120)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.container,
            // Opaque by design: this bar sits over live scroll content, so any
            // translucency lets the cards behind it ghost through and the whole
            // screen reads as broken.
            { paddingBottom, backgroundColor: colors.card },
            cardShadow,
          ]}
        >

          {/* Hairline border top */}
          <View style={[styles.topBorder, { backgroundColor: colors.border }]} />

          {/* ── Before → After comparison ── */}
          <View style={styles.diffCard}>
            {/* Savings row */}
            <View style={styles.comparisonRow}>
              <View style={styles.compCell}>
                <Text variant="caption" style={[styles.compLabel, { color: colors.textSecondary }]}>
                  Monthly savings (before)
                </Text>
                <Text style={[styles.compValue, { color: colors.textSecondary }]}>
                  {fmt(previousMonthlySavings)}
                </Text>
              </View>

              <ArrowDown color={colors.textSecondary} size={14} style={{ marginHorizontal: 8, marginTop: 18 }} />

              <View style={[styles.compCell, styles.compCellRight]}>
                <Text variant="caption" style={[styles.compLabel, { color: colors.textSecondary }]}>
                  Monthly savings (after)
                </Text>
                <View style={styles.deltaRow}>
                  <Text style={[styles.compValue, { color: colors.textPrimary }]}>
                    {fmt(monthlySavings)}
                  </Text>
                  {savingsDelta !== 0 && (
                    <View
                      style={[
                        styles.deltaBadge,
                        { backgroundColor: `${deltaColor(savingsSign)}15` },
                      ]}
                    >
                      <Text
                        style={{
                          color: deltaColor(savingsSign),
                          fontFamily: 'Satoshi-Bold',
                          fontSize: 11,
                        }}
                      >
                        {fmtDelta(savingsDelta)}/mo
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.innerDivider, { backgroundColor: colors.border }]} />

            {/* Safe to spend row */}
            <View style={styles.comparisonRow}>
              <View style={styles.compCell}>
                <Text variant="caption" style={[styles.compLabel, { color: colors.textSecondary }]}>
                  Safe to spend (before)
                </Text>
                <Text style={[styles.compValue, { color: colors.textSecondary }]}>
                  {fmt(previousSafeToSpend)}
                </Text>
              </View>

              <ArrowDown color={colors.textSecondary} size={14} style={{ marginHorizontal: 8, marginTop: 18 }} />

              <View style={[styles.compCell, styles.compCellRight]}>
                <Text variant="caption" style={[styles.compLabel, { color: colors.textSecondary }]}>
                  Safe to spend (after)
                </Text>
                <View style={styles.deltaRow}>
                  <Text style={[styles.compValue, { color: colors.textPrimary }]}>
                    {fmt(safeToSpend)}
                  </Text>
                  {spendDelta !== 0 && (
                    <View
                      style={[
                        styles.deltaBadge,
                        { backgroundColor: `${deltaColor(spendSign)}15` },
                      ]}
                    >
                      <Text
                        style={{
                          color: deltaColor(spendSign),
                          fontFamily: 'Satoshi-Bold',
                          fontSize: 11,
                        }}
                      >
                        {fmtDelta(spendDelta)}/mo
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Unbalanced warning */}
          {!isBalanced && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[styles.warningBar, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}
            >
              <Text
                variant="caption"
                style={{ color: colors.danger, fontFamily: 'Satoshi-Bold', textAlign: 'center' }}
              >
                Allocation must total 100% before you can apply
              </Text>
            </Animated.View>
          )}

          {/* CTA */}
          <PressableScale
            onPress={handleApply}
            disabled={btnDisabled}
            style={[
              styles.lockBtn,
              {
                backgroundColor: btnDisabled ? colors.chipBg : colors.textPrimary,
                opacity: btnDisabled ? 0.5 : 1,
              },
            ]}
          >
            <LockKeyhole color={btnDisabled ? colors.textSecondary : '#FFF'} size={18} />
            <Text style={[styles.lockBtnText, { color: btnDisabled ? colors.textSecondary : '#FFF' }]}>
              {isLoading ? 'Applying…' : 'Lock In This Plan'}
            </Text>
          </PressableScale>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  topBorder: {
    height: 1,
    marginBottom: 16,
  },
  diffCard: {
    marginBottom: 12,
    gap: 0,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  compCell: {
    flex: 1,
    gap: 4,
  },
  compCellRight: {
    alignItems: 'flex-end',
  },
  compLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  compValue: {
    fontFamily: 'Satoshi-Black',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  innerDivider: {
    height: 1,
  },
  warningBar: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 16,
    marginBottom: 4,
  },
  lockBtnText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
