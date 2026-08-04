import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  ChevronDown,
  Home,
  Flame,
  Briefcase,
  Users,
  Heart,
  Plus,
} from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';

import { Text } from '../ui/Text';
import { AppHeader } from '../ui/AppHeader';
import { useSpecTheme } from '../../theme/specTheme';
import { useBudgetStore } from '../../store/budgetStore';

import { ExpandableCategoryCard } from './ExpandableCategoryCard';
import { MoneyFlowVisualizer } from './MoneyFlowVisualizer';
import { MoneyPlanHero } from './MoneyPlanHero';
import { LifestyleProfileCard } from './LifestyleProfileCard';
import { MoneyPlanProjection } from './MoneyPlanProjection';
import { MoneyPlanSaveBar } from './MoneyPlanSaveBar';
import { PressableScale } from '../anim/PressableScale';
import { CountUp } from '../anim/CountUp';

import { useMoneyPlanIntelligence } from '../../hooks/useMoneyPlanIntelligence';
import {
  computeMoneyPlanScore,
  computeBucketTrend,
  predictBucketPace,
} from '../../services/moneyPlanIntelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Preset definitions — outcome-first copy
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'starter',
    name: 'Balanced',
    n: 50,
    w: 30,
    s: 20,
    // Icon colour must match iconFgColor below — these circles use a pale
    // pastel background, so a white glyph is effectively invisible.
    icon: <Home size={18} color="#2E7D32" />,
    outcomeStory: 'The golden rule. Spend freely, save steadily.',
    iconBgColor: '#E8F5E9',
    iconFgColor: '#2E7D32',
  },
  {
    id: 'wealth',
    name: 'Wealth Builder',
    n: 50,
    w: 20,
    s: 30,
    icon: <Briefcase size={18} color="#1565C0" />,
    outcomeStory: 'Save 50% more. Retire years earlier.',
    recommended: true,
    iconBgColor: '#E3F2FD',
    iconFgColor: '#1565C0',
  },
  {
    id: 'fire',
    name: 'FIRE',
    n: 40,
    w: 10,
    s: 50,
    icon: <Flame size={18} color="#E65100" />,
    outcomeStory: 'Financial independence. Retire early. Live freely.',
    iconBgColor: '#FFF3E0',
    iconFgColor: '#E65100',
  },
  {
    id: 'family',
    name: 'Family First',
    n: 60,
    w: 20,
    s: 20,
    icon: <Users size={18} color="#AD1457" />,
    outcomeStory: 'Stable household. Cover every family need.',
    iconBgColor: '#FCE4EC',
    iconFgColor: '#AD1457',
  },
];

// Identify which preset matches the current saved percentages
const matchPreset = (n: number, w: number, s: number): string | null => {
  const match = PRESETS.find(p => p.n === n && p.w === w && p.s === s);
  return match ? match.id : null;
};

// ─────────────────────────────────────────────────────────────────────────────

export const MoneyPlanShell = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, iconShadow, cardShadow } = useSpecTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { settings, loadBudget, saveBudget, isLoading } = useBudgetStore();
  const { income, buckets, emergencyFundGoal, reload: reloadIntelligence } =
    useMoneyPlanIntelligence();

  const [needs, setNeeds] = useState(settings.needsPercent);
  const [wants, setWants] = useState(settings.wantsPercent);
  const [savings, setSavings] = useState(settings.savingsPercent);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadBudget();
  }, []);

  useEffect(() => {
    setNeeds(settings.needsPercent);
    setWants(settings.wantsPercent);
    setSavings(settings.savingsPercent);
  }, [settings]);

  const total = needs + wants + savings;
  const isBalanced = total === 100;

  // The preset id of the plan currently saved in DB.
  const activePlanId = useMemo(
    () => matchPreset(settings.needsPercent, settings.wantsPercent, settings.savingsPercent),
    [settings.needsPercent, settings.wantsPercent, settings.savingsPercent]
  );

  // The preset matching the *unsaved draft*. This is what drives the immediate
  // selected state on tap — activePlanId alone can't, because it only changes
  // once the plan is persisted, leaving a tapped card with no feedback at all.
  // Null when the user has dragged the sliders to a custom split.
  const selectedPlanId = useMemo(
    () => matchPreset(needs, wants, savings),
    [needs, wants, savings]
  );

  const applyPreset = (n: number, w: number, s: number) => {
    setNeeds(n);
    setWants(w);
    setSavings(s);
  };

  const handleSave = async () => {
    if (!isBalanced) return;
    try {
      await saveBudget({
        needsPercent: needs,
        wantsPercent: wants,
        savingsPercent: savings,
      });
      setShowSuccess(true);
      await reloadIntelligence().catch(() => {});
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 3200);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save budget');
    }
  };

  const safeToSpend = Math.round(income * ((needs + wants) / 100));
  const estimatedSavings = Math.round(income * (savings / 100));

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = today.getDate();

  const scoreResult = computeMoneyPlanScore({
    income,
    needsPercent: needs,
    wantsPercent: wants,
    savingsPercent: savings,
    emergencyFundStarted: emergencyFundGoal ? emergencyFundGoal.currentAmount > 0 : null,
  });

  const bucketView = (bucket: 'needs' | 'wants' | 'savings', percent: number) => {
    const data = buckets[bucket];
    const budgetForBucket = income * (percent / 100);
    return {
      topCategories: data.topCategories,
      trend: computeBucketTrend(data.currentSpend, data.previousSpend),
      pacePrediction:
        budgetForBucket > 0
          ? predictBucketPace({
              spendSoFar: data.currentSpend,
              daysElapsed,
              daysInMonth,
              budget: budgetForBucket,
            })
          : null,
    };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <AppHeader 
          title="Money Plan" 
          onBack={() => navigation.goBack()} 
          rightActions={
            <PressableScale
              onPress={() => navigation.navigate('UserTabs', { screen: 'Add' })}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chipBg }}
            >
              <Plus size={20} color={colors.textPrimary} strokeWidth={2.2} />
            </PressableScale>
          }
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // Extra bottom padding to clear the SaveBar when it's visible
            { paddingBottom: showSuccess ? 40 : 260 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* HERO */}
          <MoneyPlanHero
            income={income}
            safeToSpend={safeToSpend}
            monthlySavings={estimatedSavings}
            hasIncome={income > 0}
            score={scoreResult.score}
            topRecommendation={scoreResult.recommendations[0] ?? null}
            isBalanced={isBalanced}
            onAddIncome={() => navigation.navigate('UserTabs', { screen: 'Add', params: { type: 'income' } })}
            colors={colors}
          />

          {/* MONEY FLOW */}
          <MoneyFlowVisualizer
            income={income}
            needs={needs}
            wants={wants}
            savings={savings}
            safeToSpend={safeToSpend}
            colors={colors}
          />

          {/* INTERACTIVE ALLOCATION CARDS */}
          <View style={{ paddingHorizontal: 24 }}>
            <ExpandableCategoryCard
              icon={<Heart color={colors.mintDeep} size={22} />}
              name="Needs"
              percentage={needs}
              rupees={income * (needs / 100)}
              color={colors.mintDeep}
              tint={colors.mint}
              recommendedRange="50–60%"
              includedExpenses="Rent, groceries, utilities, insurance"
              insights={
                needs > 60
                  ? 'Your essential expenses are unusually high. Consider finding ways to lower fixed costs.'
                  : 'Your essentials are well balanced.'
              }
              onChange={setNeeds}
              {...bucketView('needs', needs)}
            />

            <ExpandableCategoryCard
              icon={<Flame color={colors.peachDeep} size={22} />}
              name="Wants"
              percentage={wants}
              rupees={income * (wants / 100)}
              color={colors.peachDeep}
              tint={colors.peach}
              recommendedRange="20–30%"
              includedExpenses="Dining out, entertainment, hobbies"
              insights={
                wants > 30
                  ? `Reduce Wants by 5% to save an extra ₹${((income * 0.05) * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })} every year.`
                  : 'Healthy lifestyle spending.'
              }
              onChange={setWants}
              {...bucketView('wants', wants)}
            />

            <ExpandableCategoryCard
              icon={<Briefcase color={colors.skyDeep} size={22} />}
              name="Savings"
              percentage={savings}
              rupees={income * (savings / 100)}
              color={colors.skyDeep}
              tint={colors.sky}
              recommendedRange="20%+"
              includedExpenses="Emergency fund, investments, goals"
              insights={
                savings < 20
                  ? 'Push this to 20% to accelerate your wealth building.'
                  : 'Excellent savings rate!'
              }
              onChange={setSavings}
              {...bucketView('savings', savings)}
            />
          </View>

          {/* EXPLORE OTHER PLANS */}
          <PressableScale
            style={[
              styles.advancedHeader,
              { backgroundColor: colors.card, borderRadius: cardRadius },
              cardShadow,
            ]}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <View style={{ flex: 1 }}>
              <Text
                variant="h3"
                style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}
              >
                Explore Other Plans
              </Text>
              <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                Try a preset lifestyle or see where this plan leads
              </Text>
            </View>
            <View style={[styles.chevronCircle, { backgroundColor: colors.chipBg }, iconShadow]}>
              <ChevronDown
                color={colors.textSecondary}
                size={16}
                style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }}
              />
            </View>
          </PressableScale>

          {showAdvanced && (
            <Animated.View
              entering={SlideInDown.springify().damping(22).stiffness(100)}
              exiting={SlideOutDown.duration(200)}
              style={styles.advancedContent}
            >
              <Text
                variant="caption"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                LIFESTYLE PROFILES
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presetsScroller}
                contentContainerStyle={styles.presetsScroll}
              >
                {PRESETS.map(p => (
                  <LifestyleProfileCard
                    key={p.id}
                    preset={p}
                    income={income}
                    onSelect={applyPreset}
                    colors={colors}
                    cardRadius={cardRadius}
                    activePlanId={activePlanId}
                    selectedPlanId={selectedPlanId}
                    iconBgColor={p.iconBgColor}
                    iconFgColor={p.iconFgColor}
                  />
                ))}
              </ScrollView>

              <Text
                variant="caption"
                style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 32 }]}
              >
                YOUR FINANCIAL FUTURE
              </Text>

              <MoneyPlanProjection
                income={income}
                savingsPercent={savings}
                emergencyFundTarget={emergencyFundGoal?.targetAmount ?? 100000}
                emergencyFundCurrent={emergencyFundGoal?.currentAmount ?? 0}
                colors={colors}
                cardRadius={cardRadius}
              />
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* SAVE BAR — positioned absolute over scroll content */}
      <MoneyPlanSaveBar
        hasChanges={
          needs !== settings.needsPercent ||
          wants !== settings.wantsPercent ||
          savings !== settings.savingsPercent
        }
        isBalanced={isBalanced}
        isLoading={isLoading}
        safeToSpend={safeToSpend}
        monthlySavings={estimatedSavings}
        previousSafeToSpend={Math.round(income * ((settings.needsPercent + settings.wantsPercent) / 100))}
        previousMonthlySavings={Math.round(income * (settings.savingsPercent / 100))}
        onApply={handleSave}
        colors={colors}
        paddingBottom={insets.bottom + 16}
      />

      {/* SUCCESS BLUR MODAL */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(400)}
          style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType={colors.background === '#FFFFFF' ? 'light' : 'dark'}
              blurAmount={24}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: 0.96 }]}
            />
          )}

          <View style={styles.successContent}>
            <View style={[styles.successRing, { backgroundColor: `${colors.mintDeep}12`, borderColor: `${colors.mintDeep}30` }]}>
              <CheckCircle2 color={colors.mintDeep} size={56} strokeWidth={1.5} />
            </View>
            <Text
              style={{ fontFamily: 'Satoshi-Black', fontSize: 28, color: colors.textPrimary, marginBottom: 8 }}
            >
              Plan Locked In
            </Text>
            <Text
              variant="body"
              style={{ color: colors.textSecondary, marginBottom: 36, textAlign: 'center', maxWidth: 260 }}
            >
              Your financial strategy is set for the month.
            </Text>

            <View style={[styles.successStats, { backgroundColor: colors.card }, cardShadow]}>
              <View style={styles.simRow}>
                <Text
                  variant="caption"
                  style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}
                >
                  Safe To Spend
                </Text>
                <CountUp
                  value={safeToSpend}
                  prefix="₹"
                  style={{ fontFamily: 'Satoshi-Black', fontSize: 18, color: colors.textPrimary }}
                />
              </View>
              <View style={[styles.simDivider, { backgroundColor: colors.border }]} />
              <View style={styles.simRow}>
                <Text
                  variant="caption"
                  style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}
                >
                  Monthly Savings
                </Text>
                <CountUp
                  value={estimatedSavings}
                  prefix="₹"
                  style={{ fontFamily: 'Satoshi-Black', fontSize: 18, color: colors.mintDeep }}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    scrollContent: {
      // dynamic paddingBottom set inline based on SaveBar visibility
    },
    advancedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 24,
      marginTop: 16,
      padding: 20,
    },
    chevronCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    advancedContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    sectionLabel: {
      fontFamily: 'Satoshi-Bold',
      letterSpacing: 1.5,
      marginBottom: 16,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    // Cancel advancedContent's 24px side padding so the row can bleed to both
    // screen edges — otherwise cards are clipped 24px in, which reads as a
    // broken cut rather than a scrollable peek.
    presetsScroller: {
      marginHorizontal: -24,
    },
    presetsScroll: {
      gap: 12,
      paddingHorizontal: 24,
      // Headroom for the active card's scale(1.02) and its shadow.
      paddingVertical: 6,
    },
    simRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    simDivider: {
      height: 1,
      marginVertical: 16,
    },
    successContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    successRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    successStats: {
      width: '100%',
      padding: 24,
      borderRadius: 24,
    },
  });
