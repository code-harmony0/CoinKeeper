import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { useGoalStore } from '../../store/goalStore';
import { useTransactionStore } from '../../store/transactionStore';
import { ChevronLeft, Plus, Target } from 'lucide-react-native';
import { PressableScale } from '../../components/anim/PressableScale';
import { AddGoalSheet } from '../../components/modals/AddGoalSheet';
import { AddFundsSheet } from '../../components/modals/AddFundsSheet';
import { FocusGoalHeroCard } from '../../components/insights/FocusGoalHeroCard';
import { SecondaryGoalCard } from '../../components/insights/SecondaryGoalCard';
import { GoalsHeroDashboard } from '../../components/insights/GoalsHeroDashboard';
import { GoalCelebrationModal } from '../../components/insights/GoalCelebrationModal';
import { Money } from '../../utils/money';
import { useGoalIntelligence } from '../../hooks/useGoalIntelligence';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  DURATION,
  EXPRESSIVE,
  STAGGER,
  sequenceDelay,
  useReducedMotion,
} from '../../theme/motion';

const isInMonth = (dateStr: string, monthsAgo: number): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
};

export const GoalsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { addGoal, getEmergencyFundTarget, updateGoalProgress, deleteGoal } = useGoalStore();
  const { transactions } = useTransactionStore();
  const { rankedGoals, savingsBudgetRemainingPaise } = useGoalIntelligence();
  const reduced = useReducedMotion();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{ id: string, name: string } | null>(null);
  const [celebratingGoal, setCelebratingGoal] = useState<{ name: string; targetAmount: number } | null>(null);

  useEffect(() => {
    useGoalStore.getState().loadGoals().then(() => {
      getEmergencyFundTarget();
    });
  }, []);

  const handleAddGoal = async (goalName: string, targetStr: string, deadline?: string) => {
    const targetAmountPaise = Money.toPaise(targetStr);
    if (targetAmountPaise <= 0) {
      throw new Error('Invalid amount');
    }

    await addGoal({
      name: goalName,
      targetAmount: targetAmountPaise,
      currentAmount: 0,
      deadline,
    });

    setShowAdd(false);
  };

  const handleAddProgress = async (amountStr: string) => {
    if (!selectedGoal) return;

    const amtPaise = Money.toPaise(amountStr);
    if (amtPaise <= 0) {
      throw new Error('Invalid amount');
    }

    const target = rankedGoals.find(r => r.goal.id === selectedGoal.id)?.goal;
    const wasIncomplete = !!target && target.currentAmount < target.targetAmount;

    await updateGoalProgress(selectedGoal.id, amtPaise);
    setSelectedGoal(null);

    if (target && wasIncomplete && target.currentAmount + amtPaise >= target.targetAmount) {
      setCelebratingGoal({ name: target.name, targetAmount: target.targetAmount });
    }
  };

  const handleRouteSurplus = () => {
    const topGoal = rankedGoals[0];
    if (!topGoal || savingsBudgetRemainingPaise <= 0) return;

    const remainingGapPaise = Math.max(0, topGoal.goal.targetAmount - topGoal.goal.currentAmount);
    const amountPaise = Math.min(savingsBudgetRemainingPaise, remainingGapPaise);
    if (amountPaise <= 0) return;

    Alert.alert(
      'Route Surplus to Goal',
      `Move ${Money.format(amountPaise, { zeroDecimals: true })} of this month's unused savings into "${topGoal.goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Route Funds',
          onPress: async () => {
            try {
              await updateGoalProgress(topGoal.goal.id, amountPaise);
              if (topGoal.goal.currentAmount + amountPaise >= topGoal.goal.targetAmount) {
                setCelebratingGoal({ name: topGoal.goal.name, targetAmount: topGoal.goal.targetAmount });
              }
            } catch (e) {
              Alert.alert('Could not move funds', e instanceof Error ? e.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(id);
        }
      }
    ]);
  };

  const goalTransfers = transactions.filter(t => t.type === 'transfer_to_goal').slice(0, 5);

  const allGoalTransfers = transactions.filter(t => t.type === 'transfer_to_goal');
  const contributedThisMonthPaise = allGoalTransfers.filter(t => isInMonth(t.date, 0)).reduce((sum, t) => sum + t.amountPaise, 0);
  const contributedLastMonthPaise = allGoalTransfers.filter(t => isInMonth(t.date, 1)).reduce((sum, t) => sum + t.amountPaise, 0);

  // Fixed accent rotation order (lavender → pink → mint → peach → sky) — see DESIGN.md §2.
  const goalTints = [colors.lavender, colors.pink, colors.mint, colors.peach, colors.sky];
  const goalDeeps = [colors.lavenderDeep, colors.pinkDeep, colors.mintDeep, colors.peachDeep, colors.skyDeep];

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color={colors.textPrimary} size={24} />
        </PressableScale>
        <Text variant="h2" style={{ color: colors.textPrimary }}>Goals</Text>
        <PressableScale
          onPress={() => setShowAdd(true)}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Add a goal"
        >
          <Plus color={colors.textPrimary} size={24} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {rankedGoals.length === 0 ? (
          <Animated.View
            style={styles.emptyState}
            entering={FadeInDown.duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}
          >
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primaryAccent}15` }]}>
              <Target color={colors.primaryAccent} size={48} />
            </View>
            <Text variant="h2" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginTop: 16 }}>What's your first dream?</Text>
            <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
              Whether it's a new laptop or an emergency fund, every great journey starts with a single goal.
            </Text>
            {/* The empty state's one bit of forward motion — a number to aim at, not just an invitation to start. */}
            <Text variant="caption" style={{ color: colors.success, fontFamily: 'Satoshi-Bold', marginTop: 12 }}>
              Your first ₹500 is the hardest one.
            </Text>
            <Button
              title="Create First Goal"
              onPress={() => setShowAdd(true)}
              style={{ marginTop: 32, paddingHorizontal: 32 }}
            />
          </Animated.View>
        ) : (
          <>
            <GoalsHeroDashboard
              rankedGoals={rankedGoals}
              contributedThisMonthPaise={contributedThisMonthPaise}
              contributedLastMonthPaise={contributedLastMonthPaise}
              savingsBudgetRemainingPaise={savingsBudgetRemainingPaise}
              onRouteSurplus={handleRouteSurplus}
            />

            <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
              {rankedGoals.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <FocusGoalHeroCard
                    name={rankedGoals[0].goal.name}
                    currentAmount={rankedGoals[0].goal.currentAmount}
                    targetAmount={rankedGoals[0].goal.targetAmount}
                    health={rankedGoals[0].health}
                    priorityRank={rankedGoals[0].priorityRank}
                    tint={goalTints[0]}
                    deep={goalDeeps[0]}
                    onPress={() => setSelectedGoal({ id: rankedGoals[0].goal.id, name: rankedGoals[0].goal.name })}
                    onAddFunds={() => setSelectedGoal({ id: rankedGoals[0].goal.id, name: rankedGoals[0].goal.name })}
                    // Long-press to delete worked on every card except the top
                    // one, which made the #1 goal the only undeletable goal in
                    // the app — you had to fund it past the top spot first.
                    onLongPress={() => handleDelete(rankedGoals[0].goal.id)}
                  />
                </View>
              )}

              {rankedGoals.length > 1 && (
                <>
                  <Text variant="caption" style={[styles.eyebrow, { marginBottom: 16 }]}>Other Active Goals</Text>
                  {rankedGoals.slice(1).map((ranked, index) => (
                    <Animated.View
                      key={ranked.goal.id}
                      entering={FadeInDown
                        .delay(sequenceDelay(900 + index * STAGGER.normal, reduced))
                        .duration(DURATION.entrance)
                        .reduceMotion(EXPRESSIVE)}
                    >
                    <SecondaryGoalCard
                      name={ranked.goal.name}
                      currentAmount={ranked.goal.currentAmount}
                      targetAmount={ranked.goal.targetAmount}
                      health={ranked.health}
                      themeColor={goalDeeps[(index + 1) % goalDeeps.length]}
                      onPress={() => setSelectedGoal({ id: ranked.goal.id, name: ranked.goal.name })}
                      onLongPress={() => handleDelete(ranked.goal.id)}
                    />
                    </Animated.View>
                  ))}
                </>
              )}

              {goalTransfers.length > 0 && (
                <Animated.View
                  style={{ marginTop: 32 }}
                  entering={FadeIn.delay(sequenceDelay(1100, reduced)).duration(DURATION.entrance).reduceMotion(EXPRESSIVE)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text variant="caption" style={styles.eyebrow}>Recent Activity</Text>
                    <PressableScale
                      onPress={() => (navigation as any).navigate('Transactions')}
                      accessibilityRole="button"
                      accessibilityLabel="View all goal transfers"
                      // Was a ~34pt row; 44pt is the floor for a touch target.
                      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Bold', color: colors.skyDeep }}>View All</Text>
                    </PressableScale>
                  </View>
                  <View style={[styles.activityCard, cardShadow, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
                    {goalTransfers.map((tx, index) => (
                      <View
                        key={tx.id}
                        style={[
                          styles.activityRow,
                          index < goalTransfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View>
                          <Text style={{ fontSize: 15, fontFamily: 'Satoshi-Bold', color: colors.textPrimary }}>{tx.description || tx.category}</Text>
                          <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Medium', color: colors.textSecondary, marginTop: 4 }}>
                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 15, fontFamily: 'Satoshi-Black', color: colors.skyDeep }}>
                          +{Money.format(tx.amountPaise, { zeroDecimals: true })}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <AddGoalSheet 
        visible={showAdd} 
        onClose={() => setShowAdd(false)} 
        onSubmit={handleAddGoal} 
      />

      <AddFundsSheet
        visible={!!selectedGoal}
        goalName={selectedGoal?.name}
        goal={rankedGoals.find(r => r.goal.id === selectedGoal?.id)?.goal}
        health={rankedGoals.find(r => r.goal.id === selectedGoal?.id)?.health}
        savingsBudgetRemainingPaise={savingsBudgetRemainingPaise}
        onClose={() => setSelectedGoal(null)}
        onSubmit={handleAddProgress}
      />

      <GoalCelebrationModal
        visible={!!celebratingGoal}
        goalName={celebratingGoal?.name ?? ''}
        targetAmountPaise={celebratingGoal?.targetAmount ?? 0}
        onDismiss={() => setCelebratingGoal(null)}
      />
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any) =>
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
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: -4,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: 80,
    },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    eyebrow: {
      // textSecondary lands at ~4.0:1 on the light-blue canvas and fails AA.
      // specTheme ships sectionLabel (~6.6:1) for exactly this — the eyebrows
      // here were still on the failing token. See DESIGN.md §2.
      color: colors.sectionLabel,
      fontFamily: 'Satoshi-Bold',
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    activityCard: {
      overflow: 'hidden',
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
  });
