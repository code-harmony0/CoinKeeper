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
import { Money } from '../../utils/money';

export const GoalsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  
  const { goals, loadGoals, addGoal, getEmergencyFundTarget, updateGoalProgress, deleteGoal } = useGoalStore();
  const { transactions } = useTransactionStore();
  
  const [showAdd, setShowAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    loadGoals().then(() => {
      getEmergencyFundTarget();
    });
  }, []);

  const handleAddGoal = async (goalName: string, targetStr: string) => {
    const targetAmountPaise = Money.toPaise(targetStr);
    if (targetAmountPaise <= 0) {
      throw new Error('Invalid amount');
    }

    await addGoal({
      name: goalName,
      targetAmount: targetAmountPaise,
      currentAmount: 0,
    });

    setShowAdd(false);
  };

  const handleAddProgress = async (amountStr: string) => {
    if (!selectedGoal) return;
    
    const amtPaise = Money.toPaise(amountStr);
    if (amtPaise <= 0) {
      throw new Error('Invalid amount');
    }

    await updateGoalProgress(selectedGoal.id, amtPaise);
    setSelectedGoal(null);
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

  // Sort: Emergency Fund first
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.isEmergencyFund) return -1;
    if (b.isEmergencyFund) return 1;
    return 0;
  });

  const goalTransfers = transactions.filter(t => t.type === 'transfer_to_goal').slice(0, 5);

  // Fixed accent rotation order (lavender → pink → mint → peach → sky) — see DESIGN.md §2.
  const goalTints = [colors.lavender, colors.pink, colors.mint, colors.peach, colors.sky];
  const goalDeeps = [colors.lavenderDeep, colors.pinkDeep, colors.mintDeep, colors.peachDeep, colors.skyDeep];

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </PressableScale>
        <Text variant="h2" style={{ color: colors.textPrimary }}>Goals</Text>
        <PressableScale onPress={() => setShowAdd(!showAdd)} style={styles.backBtn}>
          <Plus color={colors.textPrimary} size={24} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primaryAccent}15` }]}>
              <Target color={colors.primaryAccent} size={48} />
            </View>
            <Text variant="h2" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginTop: 16 }}>What's your first dream?</Text>
            <Text variant="caption" style={{ color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
              Whether it's a new laptop or an emergency fund, every great journey starts with a single goal.
            </Text>
            <Button 
              title="Create First Goal" 
              onPress={() => setShowAdd(true)}
              style={{ marginTop: 32, paddingHorizontal: 32 }}
            />
          </View>
        ) : (
          <>
            <GoalsHeroDashboard goals={goals} />
            
            <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
              {sortedGoals.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <FocusGoalHeroCard
                    name={sortedGoals[0].name}
                    currentAmount={sortedGoals[0].currentAmount}
                    targetAmount={sortedGoals[0].targetAmount}
                    tint={goalTints[0]}
                    deep={goalDeeps[0]}
                    onPress={() => setSelectedGoal({ id: sortedGoals[0].id, name: sortedGoals[0].name })}
                    onAddFunds={() => setSelectedGoal({ id: sortedGoals[0].id, name: sortedGoals[0].name })}
                  />
                </View>
              )}

              {sortedGoals.length > 1 && (
                <>
                  <Text variant="caption" style={[styles.eyebrow, { marginBottom: 16 }]}>Other Active Goals</Text>
                  {sortedGoals.slice(1).map((goal, index) => (
                    <SecondaryGoalCard
                      key={goal.id}
                      name={goal.name}
                      currentAmount={goal.currentAmount}
                      targetAmount={goal.targetAmount}
                      themeColor={goalDeeps[(index + 1) % goalDeeps.length]}
                      onPress={() => setSelectedGoal({ id: goal.id, name: goal.name })}
                      onLongPress={() => handleDelete(goal.id)}
                    />
                  ))}
                </>
              )}

              {goalTransfers.length > 0 && (
                <View style={{ marginTop: 32 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text variant="caption" style={styles.eyebrow}>Recent Activity</Text>
                    <PressableScale onPress={() => (navigation as any).navigate('Transactions')} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
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
                </View>
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
        onClose={() => setSelectedGoal(null)}
        onSubmit={handleAddProgress}
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
      color: colors.textSecondary,
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
