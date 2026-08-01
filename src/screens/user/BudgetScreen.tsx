import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, withRepeat, withTiming, useAnimatedStyle, useSharedValue, Easing } from 'react-native-reanimated';
import { ChevronLeft, CheckCircle2, ChevronDown, ChevronUp, Home, Flame, Briefcase, Users, Heart } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { useBudgetStore } from '../../store/budgetStore';
import { getDb } from '../../store/database';
import { fromPaise } from '../../utils/money';
import { PressableScale } from '../../components/anim/PressableScale';

import { ExpandableCategoryCard } from '../../components/budget/ExpandableCategoryCard';
import { MoneyFlowVisualizer } from '../../components/budget/MoneyFlowVisualizer';

const { width } = Dimensions.get('window');

const PRESETS = [
  { id: 'starter', name: 'Starter', n: 50, w: 30, s: 20, icon: <Home size={18} color="#FFF" />, desc: 'The golden rule of personal finance.' },
  { id: 'wealth', name: 'Wealth Builder', n: 50, w: 20, s: 30, icon: <Briefcase size={18} color="#FFF" />, desc: 'Accelerate your investments.' },
  { id: 'fire', name: 'FIRE', n: 40, w: 10, s: 50, icon: <Flame size={18} color="#FFF" />, desc: 'Financial Independence, Retire Early.' },
  { id: 'family', name: 'Family', n: 60, w: 20, s: 20, icon: <Users size={18} color="#FFF" />, desc: 'Balanced for household stability.' }
];

export const BudgetScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors, cardRadius), [colors, cardRadius]);
  
  const { settings, loadBudget, saveBudget, isLoading } = useBudgetStore();
  
  const [needs, setNeeds] = useState(settings.needsPercent);
  const [wants, setWants] = useState(settings.wantsPercent);
  const [savings, setSavings] = useState(settings.savingsPercent);
  const [income, setIncome] = useState(0);
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
    const fetchIncome = async () => {
      try {
        const db = getDb();
        const today = new Date();
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
        const result = await db.execute(
          "SELECT SUM(amount_paise) as total FROM transactions WHERE type = 'income' AND occurred_at >= ? AND occurred_at < ?",
          [lastMonthStart, thisMonthStart]
        );
        const prevIncome = fromPaise((result.rows?.[0] as any)?.total || 0);
        setIncome(prevIncome);
      } catch (e) {
        setIncome(0);
      }
    };
    fetchIncome();
  }, []);

  useEffect(() => {
    setNeeds(settings.needsPercent);
    setWants(settings.wantsPercent);
    setSavings(settings.savingsPercent);
  }, [settings]);

  const total = needs + wants + savings;
  const isBalanced = total === 100;
  
  const getCoachInsight = () => {
    if (income === 0) return "Add your monthly income to see real rupee estimates.";
    if (total > 100) return `You allocated ${total - 100}% more than your income.`;
    if (total < 100) return `₹${((100 - total) / 100 * income).toLocaleString('en-IN', { maximumFractionDigits: 0 })} is waiting for a job.`;
    if (needs > 60) return "Your Needs are higher than recommended. Is this a special month?";
    if (savings < 15) return "Boost your savings slightly to build your emergency fund faster.";
    if (wants > 30) return "Your lifestyle spending is unusually high compared to essentials.";
    return "Perfect. Every rupee has a purpose.";
  };

  const getHeroInsight = () => {
    if (savings >= 20) return "Great job. You're on track to hit your savings goals early.";
    if (savings > 0) return "You're building wealth. Keep it up.";
    return "Start saving today to protect your future.";
  };

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
  const twelveMonthSavings = estimatedSavings * 12;

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
          
          {/* HERO PULSE */}
          <View style={styles.heroWrapper}>
            <View style={styles.heroRow}>
              <View>
                <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase' }}>Safe To Spend</Text>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', fontSize: 44, letterSpacing: -1, marginTop: 4 }}>
                  ₹{safeToSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={[styles.miniHealth, { backgroundColor: savings >= 20 ? colors.success : colors.primaryAccent }]} />
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold' }}>
                {getHeroInsight()}
              </Text>
            </View>
          </View>

          {/* COACH PILL (Floating) */}
          <View style={{ alignItems: 'center', marginTop: -20, marginBottom: 32, zIndex: 20 }}>
            <View style={[styles.coachPill, { 
              backgroundColor: isBalanced ? colors.card : colors.danger,
              shadowColor: isBalanced ? colors.textPrimary : colors.danger,
              borderColor: colors.border,
            }]}>
              <Text variant="caption" style={{ 
                color: isBalanced ? colors.textPrimary : '#FFF', 
                fontFamily: 'Satoshi-Bold',
                letterSpacing: 0.5 
              }}>
                {isBalanced ? '💡 ' : '⚠️ '}{getCoachInsight()}
              </Text>
            </View>
          </View>

          {/* MONEY FLOW */}
          <MoneyFlowVisualizer needs={needs} wants={wants} savings={savings} colors={colors} />

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
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.presetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => applyPreset(p.n, p.w, p.s)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.presetIcon, { backgroundColor: colors.primaryAccent }]}>
                      {p.icon}
                    </View>
                    <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginBottom: 2 }}>{p.name}</Text>
                    <Text variant="caption" style={{ color: colors.primaryAccent, fontFamily: 'Satoshi-Bold', marginBottom: 8 }}>{p.n} / {p.w} / {p.s}</Text>
                    <Text variant="caption" style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 16 }}>{p.desc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text variant="caption" style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 32 }]}>12-MONTH PROJECTION</Text>
              <View style={[styles.simulatorBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.simRow}>
                  <Text variant="body" style={{ color: colors.textSecondary }}>Projected Wealth</Text>
                  <Text variant="h3" style={{ color: colors.success }}>+ ₹{twelveMonthSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={styles.simDivider} />
                <View style={styles.simRow}>
                  <Text variant="body" style={{ color: colors.textSecondary }}>Emergency Fund (₹1L)</Text>
                  <Text variant="h3" style={{ color: colors.textPrimary }}>
                    {estimatedSavings > 0 ? `Ready in ${Math.ceil(100000 / estimatedSavings)} mos` : 'Never'}
                  </Text>
                </View>
              </View>

            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Button 
          title="Save Money Plan" 
          onPress={handleSave} 
          disabled={!isBalanced || isLoading}
          loading={isLoading}
        />
      </View>

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
      filter: [{ blur: 50 }], // Web/SVG blur equivalent, in RN usually need BlurView or images. For RN we just rely on opacity and shape if blur isn't supported, or use shadow tricks.
    },
    heroWrapper: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 48,
    },
    heroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    miniHealth: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    coachPill: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 1,
      elevation: 12,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
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
    presetCard: {
      width: 160,
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    presetIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    simulatorBox: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
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
    footer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(150,150,150,0.05)',
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
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    emptyCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
  });
