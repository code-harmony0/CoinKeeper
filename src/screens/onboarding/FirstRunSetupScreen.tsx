/**
 * FirstRunSetupScreen — the three minutes that decide whether the app works.
 *
 * The carousel before this one sells the app; this one sets it up. A user
 * arrives at the home screen with a declared salary, a savings share, and a
 * named goal, so the pace ring and the safe-to-spend figure have something to
 * compute against instead of the "add your income" empty state.
 *
 * Three rules govern what this screen is allowed to do:
 *
 * 1. **Nothing is invented.** No welcome bonus, no simulated first save. The
 *    salary is a recurring template the user declares, and it only materializes
 *    for months that have actually happened (`salaryStartMonth`). The goal
 *    starts at zero, because it is zero.
 * 2. **Defaults are on.** Every step opens pre-filled and pre-checked, so the
 *    user confirms a plan rather than assembling one. Opting out is a tap;
 *    opting in would be a decision, and decisions are where motivation dies.
 * 3. **Every step is skippable.** A user who taps through lands in the same app
 *    as before this screen existed — an emptier one, but never a broken one.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Check, Coins, PiggyBank, ShieldCheck, Sparkles } from 'lucide-react-native';

import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import {
  DEFAULT_MONTHLY_INCOME_PAISE,
  DEFAULT_SAVINGS_PERCENT,
  INCOME_PRESETS_PAISE,
  safetyNetTargetPaise,
  savingsSharePaise,
  salaryStartMonth,
} from '../../services/firstRunPlan';
import { RecurringIncomeService } from '../../services/income/RecurringIncomeService';
import { setRoundUpEnabled } from '../../services/roundUp';
import { useBudgetStore } from '../../store/budgetStore';
import { useGoalStore } from '../../store/goalStore';

interface Props {
  onComplete: () => void;
}

const rupees = (paise: number) => Money.format(paise, { zeroDecimals: true });

/** Payday. Most Indian salaries land on the 1st; changeable in the income flow later. */
const PAYDAY = 1;

export const FirstRunSetupScreen: React.FC<Props> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardShadow, cardRadius, space } = useSpecTheme();
  const saveBudget = useBudgetStore(s => s.saveBudget);
  const addGoal = useGoalStore(s => s.addGoal);

  const [step, setStep] = useState(0);
  const [incomePaise, setIncomePaise] = useState(DEFAULT_MONTHLY_INCOME_PAISE);
  const [incomeText, setIncomeText] = useState(
    String(Money.toRupees(DEFAULT_MONTHLY_INCOME_PAISE)),
  );
  const [trackSalary, setTrackSalary] = useState(true);
  const [saveShare, setSaveShare] = useState(true);
  const [buildSafetyNet, setBuildSafetyNet] = useState(true);
  const [roundUps, setRoundUps] = useState(true);
  const [saving, setSaving] = useState(false);

  const targetPaise = safetyNetTargetPaise(incomePaise);
  const sharePaise = savingsSharePaise(incomePaise, DEFAULT_SAVINGS_PERCENT);

  const tap = () => ReactNativeHapticFeedback.trigger('impactLight');

  const commitIncome = (text: string) => {
    setIncomeText(text);
    setIncomePaise(Money.toPaise(text));
  };

  const pickPreset = (paise: number) => {
    tap();
    setIncomePaise(paise);
    setIncomeText(String(Money.toRupees(paise)));
  };

  /**
   * Writes the plan. Each piece is independent and independently skippable, so
   * one failure never costs the others — a user whose goal insert fails still
   * gets their salary tracked.
   */
  const applyPlan = async () => {
    setSaving(true);

    if (trackSalary && incomePaise > 0) {
      try {
        await RecurringIncomeService.createTemplate({
          label: 'Salary',
          amountPaise: incomePaise,
          dayOfMonth: PAYDAY,
          startMonth: salaryStartMonth(PAYDAY, new Date()),
        });
        await RecurringIncomeService.syncRecurringIncome();
      } catch (e) {
        console.error('[firstRun] salary template failed', e);
      }
    }

    if (saveShare) {
      try {
        // The savings share is the existing budget split, not a new setting —
        // Money Plan and goalIntelligence already read this row.
        const savingsPercent = DEFAULT_SAVINGS_PERCENT;
        const remainder = 100 - savingsPercent;
        await saveBudget({
          needsPercent: Math.round(remainder * 0.625),
          wantsPercent: remainder - Math.round(remainder * 0.625),
          savingsPercent,
        });
      } catch (e) {
        console.error('[firstRun] budget split failed', e);
      }
    }

    if (buildSafetyNet) {
      try {
        await addGoal({
          name: 'My Safety Net',
          targetAmount: targetPaise,
          currentAmount: 0,
          isEmergencyFund: true,
        });
      } catch (e) {
        console.error('[firstRun] goal creation failed', e);
      }
    }

    // Written whichever way the user left it: `isRoundUpEnabled` defaults to
    // on when unset, so an explicit "off" here has to be recorded, not implied
    // by absence.
    await setRoundUpEnabled(roundUps);

    setSaving(false);
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    setStep(2);
  };

  const next = () => {
    tap();
    if (step === 0) setStep(1);
    else if (step === 1) applyPlan();
    else onComplete();
  };

  const s = makeStyles(colors, cardRadius, space);

  return (
    <View
      style={[
        s.root,
        { backgroundColor: colors.background, paddingTop: insets.top + 24 },
      ]}
    >
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={s.eyebrow}>STEP 1 OF 2</Text>
            <Text style={s.title}>What do you earn each month?</Text>
            <Text style={s.subtitle}>
              This is the only number the app needs to start. Nothing leaves
              your phone.
            </Text>

            <View style={[s.card, cardShadow]}>
              <Text style={s.fieldLabel}>Monthly income</Text>
              <View style={s.amountRow}>
                <Text style={s.currency}>₹</Text>
                <TextInput
                  value={incomeText}
                  onChangeText={commitIncome}
                  keyboardType="number-pad"
                  style={s.amountInput}
                  selectTextOnFocus
                  accessibilityLabel="Monthly income in rupees"
                />
              </View>
              <View style={s.presetRow}>
                {INCOME_PRESETS_PAISE.map(p => {
                  const active = p === incomePaise;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => pickPreset(p)}
                      style={[s.preset, active && s.presetActive]}
                    >
                      <Text style={[s.presetText, active && s.presetTextActive]}>
                        {rupees(p)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={s.eyebrow}>STEP 2 OF 2</Text>
            <Text style={s.title}>Here's your starting plan</Text>
            <Text style={s.subtitle}>
              All three are on. Turn off anything you'd rather set up yourself.
            </Text>

            <PlanRow
              icon={<PiggyBank size={22} color={colors.mintDeep} />}
              tint={colors.mint}
              title="Track my salary"
              detail={`${rupees(incomePaise)} on the ${PAYDAY}st of each month`}
              checked={trackSalary}
              onToggle={() => {
                tap();
                setTrackSalary(v => !v);
              }}
              styles={s}
              colors={colors}
              shadow={cardShadow}
            />
            <PlanRow
              icon={<ShieldCheck size={22} color={colors.lavenderDeep} />}
              tint={colors.lavender}
              title={`Set aside ${DEFAULT_SAVINGS_PERCENT}%`}
              detail={`${rupees(sharePaise)} a month, kept out of spending`}
              checked={saveShare}
              onToggle={() => {
                tap();
                setSaveShare(v => !v);
              }}
              styles={s}
              colors={colors}
              shadow={cardShadow}
            />
            <PlanRow
              icon={<Sparkles size={22} color={colors.peachDeep} />}
              tint={colors.peach}
              title="Start My Safety Net"
              detail={`A goal of ${rupees(targetPaise)} — two months of income`}
              checked={buildSafetyNet}
              onToggle={() => {
                tap();
                setBuildSafetyNet(v => !v);
              }}
              styles={s}
              colors={colors}
              shadow={cardShadow}
            />
            <PlanRow
              icon={<Coins size={22} color={colors.skyDeep} />}
              tint={colors.sky}
              title="Save my spare change"
              detail="Round spending up to the nearest ₹10 — about ₹1,000 a year"
              checked={roundUps}
              onToggle={() => {
                tap();
                setRoundUps(v => !v);
              }}
              styles={s}
              colors={colors}
              shadow={cardShadow}
            />
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeIn.duration(400)} style={s.done}>
            <View style={[s.doneIcon, { backgroundColor: colors.mint }]}>
              <Check size={40} color={colors.mintDeep} strokeWidth={3} />
            </View>
            <Text style={s.title}>Your plan is set</Text>
            <Text style={s.subtitle}>
              {buildSafetyNet
                ? `My Safety Net is waiting at ${rupees(targetPaise)}. It starts at zero — the first ${rupees(sharePaise)} lands when you save it, not before.`
                : 'You can add a goal any time from the Goals tab.'}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={next}
          disabled={saving}
          style={[s.cta, { backgroundColor: colors.primaryAccent }]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.ctaText}>
              {step === 0 ? 'Continue' : step === 1 ? 'Start saving' : 'Open my app'}
            </Text>
          )}
        </Pressable>
        {step < 2 && (
          <Pressable onPress={onComplete} style={s.skip}>
            <Text style={s.skipText}>Set this up later</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const PlanRow: React.FC<{
  icon: React.ReactNode;
  tint: string;
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useSpecTheme>['colors'];
  shadow: ReturnType<typeof useSpecTheme>['cardShadow'];
}> = ({ icon, tint, title, detail, checked, onToggle, styles: s, colors, shadow }) => (
  <Pressable
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={`${title}. ${detail}`}
    style={[s.card, s.planRow, shadow]}
  >
    <View style={[s.planIcon, { backgroundColor: tint }]}>{icon}</View>
    <View style={s.planText}>
      <Text style={s.planTitle}>{title}</Text>
      <Text style={s.planDetail}>{detail}</Text>
    </View>
    <View
      style={[
        s.check,
        {
          backgroundColor: checked ? colors.primaryAccent : 'transparent',
          borderColor: checked ? colors.primaryAccent : colors.border,
        },
      ]}
    >
      {checked && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
    </View>
  </Pressable>
);

const makeStyles = (
  colors: ReturnType<typeof useSpecTheme>['colors'],
  cardRadius: number,
  space: ReturnType<typeof useSpecTheme>['space'],
) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: space.md },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.sectionLabel,
      marginBottom: space.xs,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 34,
      marginBottom: space.xs,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: space.md,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: space.sm,
      marginBottom: space.sm,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: space.xs,
    },
    amountRow: { flexDirection: 'row', alignItems: 'center' },
    currency: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 40,
      fontWeight: '700',
      color: colors.textPrimary,
      padding: 0,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: space.sm,
    },
    preset: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.chipBg,
    },
    presetActive: { backgroundColor: colors.primaryAccent },
    presetText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    presetTextActive: { color: '#FFFFFF' },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
    planIcon: {
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planText: { flex: 1 },
    planTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    planDetail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 999,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    done: { alignItems: 'center', paddingTop: space.xl },
    doneIcon: {
      width: 88,
      height: 88,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.md,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 24,
      gap: 12,
    },
    cta: {
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    skip: { alignItems: 'center', paddingVertical: 8 },
    skipText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  });

export default FirstRunSetupScreen;
