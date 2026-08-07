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
import { ArrowDown, LockKeyhole, ShieldCheck, Info } from 'lucide-react-native';
import { Money } from '../../utils/money';
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
  `${Money.format(Math.abs(v), { zeroDecimals: true })}`;

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

          {/* ── Impact Checklist ── */}
          <View style={styles.checklistCard}>
            <Text variant="caption" style={[styles.checklistTitle, { color: colors.textSecondary }]}>AFTER SAVING:</Text>
            
            <View style={styles.checkItem}>
              <ShieldCheck size={14} color={colors.mintDeep} />
              <Text style={[styles.checkText, { color: colors.textPrimary }]}>Dashboard updates</Text>
            </View>
            <View style={styles.checkItem}>
              <ShieldCheck size={14} color={colors.mintDeep} />
              <Text style={[styles.checkText, { color: colors.textPrimary }]}>AI recommendations update</Text>
            </View>
            <View style={styles.checkItem}>
              <ShieldCheck size={14} color={colors.mintDeep} />
              <Text style={[styles.checkText, { color: colors.textPrimary }]}>Reports update</Text>
            </View>
            <View style={styles.checkItem}>
              <ShieldCheck size={14} color={colors.mintDeep} />
              <Text style={[styles.checkText, { color: colors.textPrimary }]}>Spending limits update</Text>
            </View>

            {savingsDelta > 0 && (
              <View style={[styles.impactBox, { backgroundColor: `${colors.mintDeep}10` }]}>
                <Text style={[styles.impactText, { color: colors.mintDeep }]}>
                  Estimated monthly impact: +{fmt(savingsDelta)} saved
                </Text>
              </View>
            )}
            {savingsDelta < 0 && (
              <View style={[styles.impactBox, { backgroundColor: `${colors.peachDeep}10` }]}>
                <Text style={[styles.impactText, { color: colors.peachDeep }]}>
                  Estimated monthly impact: -{fmt(Math.abs(savingsDelta))} saved
                </Text>
              </View>
            )}
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
  checklistCard: {
    marginBottom: 16,
    gap: 8,
  },
  checklistTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  impactBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  impactText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    textAlign: 'center',
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
