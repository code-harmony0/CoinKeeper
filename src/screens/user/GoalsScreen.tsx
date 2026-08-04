import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useSpecTheme } from '../../theme/specTheme';
import { useGoalStore } from '../../store/goalStore';
import { ChevronLeft, Plus, Target } from 'lucide-react-native';
import { PressableScale } from '../../components/anim/PressableScale';
import { AddGoalSheet } from '../../components/modals/AddGoalSheet';
import { AddFundsSheet } from '../../components/modals/AddFundsSheet';
import { FocusGoalHeroCard } from '../../components/insights/FocusGoalHeroCard';
import { SecondaryGoalCard } from '../../components/insights/SecondaryGoalCard';
import { GoalsHeroDashboard } from '../../components/insights/GoalsHeroDashboard';

export const GoalsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius, cardShadow, isDark } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);
  
  const { goals, loadGoals, addGoal, getEmergencyFundTarget, updateGoalProgress, deleteGoal } = useGoalStore();
  
  const [showAdd, setShowAdd] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    loadGoals().then(() => {
      getEmergencyFundTarget();
    });
  }, []);

  const handleAddGoal = async (goalName: string, targetStr: string) => {
    const targetAmount = parseFloat(targetStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      throw new Error('Invalid amount');
    }

    await addGoal({
      name: goalName,
      targetAmount,
      currentAmount: 0,
    });

    setShowAdd(false);
  };

  const handleAddProgress = async (amountStr: string) => {
    if (!selectedGoal) return;
    
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Invalid amount');
    }

    await updateGoalProgress(selectedGoal.id, amt);
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

  const goalColors = [
    colors.lavenderDeep,
    colors.mintDeep,
    colors.peachDeep,
    colors.pinkDeep,
    colors.skyDeep,
  ];

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
                    tint={goalColors[0]}
                    deep={goalColors[0]}
                    onPress={() => setSelectedGoal({ id: sortedGoals[0].id, name: sortedGoals[0].name })}
                    onAddFunds={() => setSelectedGoal({ id: sortedGoals[0].id, name: sortedGoals[0].name })}
                  />
                </View>
              )}

              {sortedGoals.length > 1 && (
                <>
                  <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Other Active Goals</Text>
                  {sortedGoals.slice(1).map((goal, index) => (
                    <SecondaryGoalCard
                      key={goal.id}
                      name={goal.name}
                      currentAmount={goal.currentAmount}
                      targetAmount={goal.targetAmount}
                      themeColor={goalColors[(index + 1) % goalColors.length]}
                      onPress={() => setSelectedGoal({ id: goal.id, name: goal.name })}
                      onLongPress={() => handleDelete(goal.id)}
                    />
                  ))}
                </>
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

const makeStyles = (colors: any, cardRadius: number, cardShadow: any) =>
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
      alignItems: 'center',
      justifyContent: 'center',
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
    }
  });
