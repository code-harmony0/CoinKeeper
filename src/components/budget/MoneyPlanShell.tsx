import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, withRepeat, withTiming, useAnimatedStyle, useSharedValue, Easing } from 'react-native-reanimated';
import { ChevronLeft, CheckCircle2, ChevronDown, Home, Flame, Briefcase, Users, Heart } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';

import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { useBudgetStore } from '../../store/budgetStore';
import { PressableScale } from '../anim/PressableScale';

import { ExpandableCategoryCard } from './ExpandableCategoryCard';
import { MoneyFlowVisualizer } from './MoneyFlowVisualizer';
import { MoneyPlanHero } from './MoneyPlanHero';
import { LifestyleProfileCard } from './LifestyleProfileCard';
import { MoneyPlanProjection } from './MoneyPlanProjection';
import { MoneyPlanSaveBar } from './MoneyPlanSaveBar';

import { useMoneyPlanIntelligence } from '../../hooks/useMoneyPlanIntelligence';
import { computeMoneyPlanScore, computeBucketTrend, predictBucketPace } from '../../services/moneyPlanIntelligence';

const { width } = Dimensions.get('window');

const PRESETS = [
  { id: 'starter', name: 'Starter', n: 50, w: 30, s: 20, icon: <Home size={18} color="#FFF" />, desc: 'The golden rule of personal finance.' },
  { id: 'wealth', name: 'Wealth Builder', n: 50, w: 20, s: 30, icon: <Briefcase size={18} color="#FFF" />, desc: 'Accelerate your investments.' },
  { id: 'fire', name: 'FIRE', n: 40, w: 10, s: 50, icon: <Flame size={18} color="#FFF" />, desc: 'Financial Independence, Retire Early.' },
  { id: 'family', name: 'Family', n: 60, w: 20, s: 20, icon: <Users size={18} color="#FFF" />, desc: 'Balanced for household stability.' }
];

export const MoneyPlanShell = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors, cardRadius), [colors, cardRadius]);

  const { settings, loadBudget, saveBudget, isLoading } = useBudgetStore();
  const { income, buckets, emergencyFundGoal, reload: reloadIntelligence } = useMoneyPlanIntelligence();

  const [needs, setNeeds] = useState(settings.needsPercent);
  const [wants, setWants] = useState(settings.wantsPercent);
  const [savings, setSavings] = useState(settings.savingsPercent);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Mesh Animation
  const pulseVal = useSharedValue(0);
  useEffect(() => {
    pulseVal.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const meshStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulseVal.value * 0.1 }, { translateX: pulseVal.value * 10 }],
    opacity: 0.6 + pulseVal.value * 0.2
  }));
  const meshStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1.1 - pulseVal.value * 0.1 }, { translateY: pulseVal.value * -15 }],
    opacity: 0.5 + pulseVal.value * 0.3
  }));

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
      reloadIntelligence();
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 3500);
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
      pacePrediction: budgetForBucket > 0 ? predictBucketPace({ spendSoFar: data.currentSpend, daysElapsed, daysInMonth, budget: budgetForBucket }) : null,
    };
  };

  // Let the user access the screen even if income is 0.
  // We just show a soft coach insight or default the values to 0.

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* Absolute Gradient Mesh Background for Hero */}
      <View style={[styles.meshContainer, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.meshBlob, meshStyle1, { backgroundColor: `${colors.primaryAccent}20`, top: -50, left: -50 }]} />
        <Animated.View style={[styles.meshBlob, meshStyle2, { backgroundColor: `${colors.mintDeep}20`, top: 50, right: -50 }]} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: 0.5 }]} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 16, zIndex: 10 }]}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </PressableScale>
        <Text variant="h2" style={{ color: colors.textPrimary }}>Money Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <MoneyPlanHero
            safeToSpend={safeToSpend}
            hasIncome={income > 0}
            score={scoreResult.score}
            topRecommendation={scoreResult.recommendations[0] ?? null}
            isBalanced={isBalanced}
            onAddIncome={() => navigation.navigate('Add')}
            colors={colors}
          />

          {/* MONEY FLOW */}
          <MoneyFlowVisualizer income={income} needs={needs} wants={wants} savings={savings} safeToSpend={safeToSpend} colors={colors} />

          {/* INTERACTIVE CARDS */}
          <View style={{ paddingHorizontal: 24 }}>
            <ExpandableCategoryCard
              icon={<Heart color={colors.mintDeep} size={24} />}
              name="Needs"
              percentage={needs}
              rupees={income * (needs / 100)}
              color={colors.mintDeep}
              recommendedRange="50-60%"
              includedExpenses="Rent, groceries, utilities, insurance"
              insights={needs > 60 ? "Your essential expenses are unusually high. Consider finding ways to lower fixed costs." : "Your essentials are well balanced."}
              onChange={setNeeds}
              {...bucketView('needs', needs)}
            />

            <ExpandableCategoryCard
              icon={<Flame color={colors.peachDeep} size={24} />}
              name="Wants"
              percentage={wants}
              rupees={income * (wants / 100)}
              color={colors.peachDeep}
              recommendedRange="20-30%"
              includedExpenses="Dining out, entertainment, hobbies"
              insights={wants > 30 ? `If you reduce Wants by 5%, you'll save an extra ₹${((income * 0.05) * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })} every year.` : "Healthy lifestyle spending."}
              onChange={setWants}
              {...bucketView('wants', wants)}
            />

            <ExpandableCategoryCard
              icon={<Briefcase color={colors.primaryAccent} size={24} />}
              name="Savings"
              percentage={savings}
              rupees={income * (savings / 100)}
              color={colors.primaryAccent}
              recommendedRange="20%+"
              includedExpenses="Emergency fund, investments, goals"
              insights={savings < 20 ? "Try to push this to 20% to accelerate your wealth building." : "Excellent savings rate!"}
              onChange={setSavings}
              {...bucketView('savings', savings)}
            />
          </View>

          {/* ADVANCED PLANNING VAULT */}
          <TouchableOpacity
            style={[styles.advancedHeader]}
            onPress={() => setShowAdvanced(!showAdvanced)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.gearIcon, { backgroundColor: colors.chipBg }]}>
                <ChevronDown color={colors.textSecondary} size={16} style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }} />
              </View>
              <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>Advanced Settings</Text>
            </View>
          </TouchableOpacity>

          {showAdvanced && (
            <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.advancedContent}>

              <Text variant="caption" style={[styles.sectionLabel, { color: colors.textSecondary }]}>LIFESTYLE PROFILES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {PRESETS.map(p => (
                  <LifestyleProfileCard
                    key={p.id}
                    preset={p}
                    income={income}
                    onSelect={applyPreset}
                    colors={colors}
                    cardRadius={cardRadius}
                  />
                ))}
              </ScrollView>

              <Text variant="caption" style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 32 }]}>12-MONTH PROJECTION</Text>
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

      {/* FOOTER CTA */}
      <MoneyPlanSaveBar
        hasChanges={needs !== settings.needsPercent || wants !== settings.wantsPercent || savings !== settings.savingsPercent}
        isBalanced={isBalanced}
        isLoading={isLoading}
        safeToSpend={safeToSpend}
        monthlySavings={estimatedSavings}
        onApply={handleSave}
        colors={colors}
        paddingBottom={insets.bottom + 16}
      />

      {/* SUCCESS BLUR MODAL */}
      {showSuccess && (
        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)} style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
          {Platform.OS === 'ios' ? (
            <BlurView style={StyleSheet.absoluteFill} blurType={colors.background === '#FFFFFF' ? 'light' : 'dark'} blurAmount={20} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: 0.95 }]} />
          )}
          <View style={styles.successContent}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color={colors.success} size={64} />
            </View>
            <Text style={{ fontFamily: 'Satoshi-Black', fontSize: 32, color: colors.textPrimary, marginBottom: 8 }}>Plan Locked</Text>
            <Text variant="body" style={{ color: colors.textSecondary, marginBottom: 48, textAlign: 'center' }}>Your financial strategy is set for the month.</Text>

            <View style={[styles.successStats, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.textPrimary }]}>
              <View style={styles.simRow}>
                <Text variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Safe To Spend</Text>
                <Text variant="h3" style={{ color: colors.textPrimary }}>₹{safeToSpend.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.simDivider} />
              <View style={styles.simRow}>
                <Text variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Est. Savings</Text>
                <Text variant="h3" style={{ color: colors.success }}>₹{estimatedSavings.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

    </View>
  );
};

const makeStyles = (colors: any, cardRadius: number) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingBottom: 40,
    },
    meshContainer: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 350,
      overflow: 'hidden',
    },
    meshBlob: {
      position: 'absolute',
      width: width * 1.2,
      height: width * 1.2,
      borderRadius: width,
      filter: [{ blur: 50 }],
    },
    advancedHeader: {
      marginHorizontal: 24,
      marginTop: 24,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(150,150,150,0.1)',
    },
    gearIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    advancedContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    sectionLabel: {
      fontFamily: 'Satoshi-Bold',
      letterSpacing: 2,
      marginBottom: 16,
      fontSize: 10,
    },
    presetsScroll: {
      gap: 16,
      paddingRight: 24,
    },
    simRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    simDivider: {
      height: 1,
      backgroundColor: 'rgba(150,150,150,0.1)',
      marginVertical: 16,
    },
    successContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    successIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: `${colors.success}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    successStats: {
      width: '100%',
      padding: 24,
      borderRadius: 24,
      borderWidth: 1,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.05,
      shadowRadius: 24,
      elevation: 8,
    },
  });
