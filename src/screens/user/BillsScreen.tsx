import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { useBillStore, Bill } from '../../store/billStore';
import { useTransactionStore } from '../../store/transactionStore';
import { ChevronLeft, Plus, ShieldCheck, AlertCircle, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react-native';
import { PressableScale } from '../../components/anim/PressableScale';
import { scheduleBillReminder, cancelBillReminder } from '../../services/notificationService';
import { toPaise, fromPaise } from '../../utils/money';
import { AddBillSheet } from '../../components/modals/AddBillSheet';
import { SwipeableBillCard } from '../../components/bills/SwipeableBillCard';

const isPaidThisMonth = (lastPaidAt?: number) => {
  if (!lastPaidAt) return false;
  const now = new Date();
  const paid = new Date(lastPaidAt);
  return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
};

export const BillsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius, cardShadow } = useSpecTheme();
  const styles = React.useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);
  
  const { bills, loadBills, addBill, markPaid, deleteBill, updateNotificationId } = useBillStore();
  const { getMonthlyStats, loadTransactions } = useTransactionStore();
  
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    loadBills();
    loadTransactions();
  }, []);

  const handleAddBill = async (billData: { name: string; amount: string; dueDay: string; isRecurring: boolean; repeatInterval?: string; reminderDaysBefore?: number; notes?: string; autoPayEnabled?: boolean }) => {
    const day = parseInt(billData.dueDay);
    if (isNaN(day) || day < 1 || day > 31) {
      throw new Error('Due day must be between 1 and 31');
    }
    
    let paise: number;
    try {
      paise = toPaise(billData.amount);
    } catch {
      throw new Error('Invalid amount');
    }

    const id = await addBill({
      name: billData.name,
      amountPaise: paise,
      dueDay: day,
      isRecurring: billData.isRecurring,
      repeatInterval: billData.repeatInterval,
      reminderDaysBefore: billData.reminderDaysBefore,
      notes: billData.notes,
      autoPayEnabled: billData.autoPayEnabled,
    });

    const bill = { id, name: billData.name, amountPaise: paise, dueDay: day, isRecurring: billData.isRecurring };
    const notificationId = await scheduleBillReminder(bill);
    if (notificationId) {
      await updateNotificationId(id, notificationId);
    }

    setShowAdd(false);
  };

  const handleMarkPaid = async (id: string, isUnpaying: boolean = false, currentNotifId?: string) => {
    try {
      const bill = bills.find(b => b.id === id);
      await markPaid(id, isUnpaying ? 0 : Date.now());
      // markPaid now inserts/removes a transaction under the hood; without this
      // the dashboard, reports, and Money Plan keep showing stale totals until
      // some other screen happens to reload the transaction list.
      await loadTransactions();
      if (currentNotifId) {
        await cancelBillReminder(currentNotifId);
      }
      
      if (bill && bill.isRecurring && !isUnpaying) {
        const notificationId = await scheduleBillReminder(bill);
        if (notificationId) {
          await updateNotificationId(id, notificationId);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMenu = (bill: Bill) => {
    const isPaid = isPaidThisMonth(bill.lastPaidAt);
    Alert.alert('Bill Options', bill.name, [
      { text: 'Cancel', style: 'cancel' },
      isPaid ? { text: 'Mark as Unpaid', onPress: () => handleMarkPaid(bill.id, true, bill.notificationId) } : { text: 'Mark as Paid', onPress: () => handleMarkPaid(bill.id, false, bill.notificationId) },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          if (bill.notificationId) {
            await cancelBillReminder(bill.notificationId);
          }
          await deleteBill(bill.id);
        }
      }
    ]);
  };

  // 1. Data Segregation
  const overdueBills = bills.filter(b => !isPaidThisMonth(b.lastPaidAt) && b.dueDay < today);
  const dueSoonBills = bills.filter(b => !isPaidThisMonth(b.lastPaidAt) && b.dueDay >= today && b.dueDay <= today + 2);
  const urgentBills = [...overdueBills, ...dueSoonBills].sort((a, b) => a.dueDay - b.dueDay);

  const regularBills = bills.filter(b => !urgentBills.find(u => u.id === b.id));
  
  // Utilities vs Subscriptions
  // Assuming a basic heuristic for now: If it has "netflix, spotify, prime, gym" it's a sub. Else utility.
  const isSub = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('netflix') || n.includes('spotify') || n.includes('prime') || n.includes('gym') || n.includes('apple') || n.includes('icloud');
  };

  const subscriptions = regularBills.filter(b => isSub(b.name));
  const utilities = regularBills.filter(b => !isSub(b.name));

  // 2. Safe to Spend Calculation
  const stats = getMonthlyStats(currentMonth, currentYear);
  const incomeRupees = stats.income || 0;
  const totalBillsAmountRupees = bills.reduce((acc, b) => acc + fromPaise(b.amountPaise), 0);
  const safeToSpendRupees = Math.max(0, incomeRupees - totalBillsAmountRupees);

  return (
    <KeyboardAvoidingView 
      style={[styles.root, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </PressableScale>
          <Text variant="h2" style={{ color: colors.textPrimary }}>Financial Health</Text>
          <PressableScale onPress={() => setShowAdd(true)} style={styles.backBtn}>
            <Plus color={colors.textPrimary} size={24} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* ZONE 1: Safe to Spend Dashboard */}
          <View style={[styles.safeToSpendCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <ShieldCheck color={colors.success} size={20} style={{ marginRight: 8 }} />
              <Text variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Satoshi-Bold' }}>Safe to Spend</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
              <Text variant="h1" style={{ color: colors.textPrimary, fontSize: 36 }}>₹{safeToSpendRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            <Text variant="caption" style={{ color: colors.textSecondary }}>Remaining after all bills & goals this month.</Text>
            
            <View style={[styles.incomeRow, { backgroundColor: colors.chipBg }]}>
              <View style={styles.incomeItem}>
                <Text style={[styles.incomeLabel, { color: colors.textSecondary }]}>Income</Text>
                <Text style={[styles.incomeValue, { color: colors.textPrimary }]}>₹{incomeRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
              <View style={styles.incomeDivider} />
              <View style={styles.incomeItem}>
                <Text style={[styles.incomeLabel, { color: colors.textSecondary }]}>Bills</Text>
                <Text style={[styles.incomeValue, { color: colors.textPrimary }]}>₹{totalBillsAmountRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>
          </View>

          {/* ZONE 2: Immediate Attention */}
          {urgentBills.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <AlertCircle color={colors.danger} size={20} style={{ marginRight: 8 }} />
                <Text variant="h3" style={{ color: colors.danger, fontFamily: 'Satoshi-Black' }}>Needs Attention</Text>
              </View>
              {urgentBills.map(b => (
                <SwipeableBillCard
                  key={b.id}
                  bill={b}
                  isPaid={isPaidThisMonth(b.lastPaidAt)}
                  isOverdue={b.dueDay < today}
                  colors={colors}
                  cardRadius={cardRadius}
                  onMarkPaid={() => handleMarkPaid(b.id)}
                  onMenu={() => handleMenu(b)}
                />
              ))}
            </View>
          )}

          {/* ZONE 3: Mini Calendar (Timeline) */}
          {bills.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <CalendarIcon color={colors.textPrimary} size={20} style={{ marginRight: 8 }} />
                <Text variant="h3" style={{ color: colors.textPrimary }}>This Month</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const dayBills = bills.filter(b => b.dueDay === day);
                  const hasBills = dayBills.length > 0;
                  const allPaid = hasBills && dayBills.every(b => isPaidThisMonth(b.lastPaidAt));
                  const isPast = day < today;
                  const hasOverdue = hasBills && isPast && !allPaid;
                  
                  let dotColor = 'transparent';
                  if (hasOverdue) dotColor = colors.danger;
                  else if (allPaid) dotColor = colors.success;
                  else if (hasBills) dotColor = colors.primaryAccent;

                  return (
                    <View key={day} style={[styles.calendarDay, day === today && { backgroundColor: colors.chipBg, borderRadius: 12 }]}>
                      <Text style={[styles.calendarDayText, { color: day === today ? colors.textPrimary : colors.textSecondary }]}>{day}</Text>
                      <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ZONE 4: Subscriptions */}
          {subscriptions.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text variant="h3" style={[styles.sectionTitle, { color: colors.textPrimary }]}>Subscriptions</Text>
              {subscriptions.map(b => (
                <SwipeableBillCard
                  key={b.id}
                  bill={b}
                  isPaid={isPaidThisMonth(b.lastPaidAt)}
                  isOverdue={false}
                  colors={colors}
                  cardRadius={cardRadius}
                  onMarkPaid={() => handleMarkPaid(b.id)}
                  onMenu={() => handleMenu(b)}
                />
              ))}
            </View>
          )}

          {/* ZONE 5: Utilities */}
          {utilities.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text variant="h3" style={[styles.sectionTitle, { color: colors.textPrimary }]}>Essential Utilities</Text>
              {utilities.map(b => (
                <SwipeableBillCard
                  key={b.id}
                  bill={b}
                  isPaid={isPaidThisMonth(b.lastPaidAt)}
                  isOverdue={false}
                  colors={colors}
                  cardRadius={cardRadius}
                  onMarkPaid={() => handleMarkPaid(b.id)}
                  onMenu={() => handleMenu(b)}
                />
              ))}
            </View>
          )}

          {bills.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <CheckCircle2 color={colors.success} size={64} style={{ marginBottom: 16 }} />
              <Text variant="h2" style={{ color: colors.textPrimary }}>All clear!</Text>
              <Text variant="body" style={{ color: colors.textSecondary, marginTop: 8 }}>You have no bills to worry about.</Text>
            </View>
          )}
        </ScrollView>

        <AddBillSheet 
          visible={showAdd} 
          onClose={() => setShowAdd(false)} 
          onSubmit={handleAddBill} 
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
    safeToSpendCard: {
      marginHorizontal: 24,
      marginBottom: 32,
      padding: 24,
      borderRadius: cardRadius,
      borderWidth: 1,
    },
    incomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      borderRadius: 16,
      padding: 16,
    },
    incomeItem: {
      flex: 1,
    },
    incomeDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(150,150,150,0.2)',
      marginHorizontal: 16,
    },
    incomeLabel: {
      fontSize: 12,
      fontFamily: 'Satoshi-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    incomeValue: {
      fontSize: 18,
      fontFamily: 'Satoshi-Black',
    },
    sectionContainer: {
      paddingHorizontal: 24,
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      marginBottom: 16,
      fontFamily: 'Satoshi-Black',
    },
    calendarScroll: {
      gap: 12,
      paddingRight: 24,
    },
    calendarDay: {
      width: 40,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarDayText: {
      fontFamily: 'Satoshi-Bold',
      fontSize: 14,
      marginBottom: 4,
    },
    calendarDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
  });
