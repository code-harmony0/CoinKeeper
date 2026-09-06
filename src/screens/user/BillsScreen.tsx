import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { EXPRESSIVE } from '../../theme/motion';
import { useBillStore, Bill } from '../../store/billStore';
import { useTransactionStore } from '../../store/transactionStore';
import {
  FinancialIntelligenceEngine,
  IntelligenceSnapshot,
} from '../../services/FinancialIntelligenceEngine';
import {
  ChevronLeft,
  Plus,
  ShieldCheck,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
} from 'lucide-react-native';
import { PressableScale, CountUp } from '../../components/anim';
import {
  scheduleBillReminder,
  cancelBillReminder,
} from '../../services/notificationService';
import { toPaise } from '../../utils/money';
import { AddBillSheet } from '../../components/modals/AddBillSheet';
import { SwipeableBillCard } from '../../components/bills/SwipeableBillCard';
import {
  billStatus,
  isPaidForCycle,
  daysInMonth,
  urgentBills as computeUrgent,
  billsSummary,
} from '../../services/billSchedule';

// Bill scheduling lives in one place. This screen used to compare bare
// `dueDay` integers against `now.getDate()`, which made a 31st-of-the-month
// bill vanish in short months and blinded "due soon" at month end — see
// services/billSchedule.ts for the full list of what that got wrong.

export const BillsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, cardRadius, cardShadow, chipRadius, iconContainerRadius } =
    useSpecTheme();
  const styles = React.useMemo(
    () => makeStyles(cardRadius, colors.chipBg),
    [cardRadius, colors.chipBg],
  );

  const {
    bills,
    loadBills,
    addBill,
    markPaid,
    deleteBill,
    updateNotificationId,
  } = useBillStore();
  const { loadTransactions } = useTransactionStore();

  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<IntelligenceSnapshot | null>(null);

  const now = new Date();
  const today = now.getDate();

  // One load path for mount and pull-to-refresh — bills, ledger and the
  // snapshot refresh together so the hero can never disagree with the list.
  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadBills(), loadTransactions()]);
      setSnapshot(await FinancialIntelligenceEngine.getCurrentSnapshot());
    } finally {
      setRefreshing(false);
    }
  }, [loadBills, loadTransactions]);

  useEffect(() => {
    setRefreshing(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddBill = async (billData: {
    name: string;
    amount: string;
    dueDay: string;
    isRecurring: boolean;
    repeatInterval?: string;
    reminderDaysBefore?: number;
    notes?: string;
    autoPayEnabled?: boolean;
  }) => {
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

    const bill = {
      id,
      name: billData.name,
      amountPaise: paise,
      dueDay: day,
      isRecurring: billData.isRecurring,
    };
    const notificationId = await scheduleBillReminder(bill);
    if (notificationId) {
      await updateNotificationId(id, notificationId);
    }

    setShowAdd(false);
  };

  const handleMarkPaid = async (
    id: string,
    isUnpaying: boolean = false,
    currentNotifId?: string,
  ) => {
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
    const isPaid = isPaidForCycle(bill, now);
    Alert.alert('Bill Options', bill.name, [
      { text: 'Cancel', style: 'cancel' },
      isPaid
        ? {
            text: 'Mark as Unpaid',
            onPress: () => handleMarkPaid(bill.id, true, bill.notificationId),
          }
        : {
            text: 'Mark as Paid',
            onPress: () => handleMarkPaid(bill.id, false, bill.notificationId),
          },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (bill.notificationId) {
            await cancelBillReminder(bill.notificationId);
          }
          await deleteBill(bill.id);
        },
      },
    ]);
  };

  // 1. Data Segregation
  const urgentBills = computeUrgent(bills, now);

  const regularBills = bills.filter(b => !urgentBills.find(u => u.id === b.id));

  // Utilities vs Subscriptions
  // Assuming a basic heuristic for now: If it has "netflix, spotify, prime, gym" it's a sub. Else utility.
  const isSub = (name: string) => {
    const n = name.toLowerCase();
    return (
      n.includes('netflix') ||
      n.includes('spotify') ||
      n.includes('prime') ||
      n.includes('gym') ||
      n.includes('apple') ||
      n.includes('icloud')
    );
  };

  const subscriptions = regularBills.filter(b => isSub(b.name));
  const utilities = regularBills.filter(b => !isSub(b.name));

  // 2. Safe to Spend — single source of truth is the snapshot. Both figures
  // come from it, so they can never briefly disagree while data loads.
  const safeToSpendPaise = snapshot?.safeToSpend ?? 0;
  const hasBills = bills.length > 0;

  // The three-second answer on a bills screen is what is still owed — not the
  // month's budget, which belongs to the Money Plan and is already a tile on
  // Home. One fact, one place.
  const summary = billsSummary(bills, now);
  const heroTone =
    summary.tone === 'bad'
      ? colors.danger
      : summary.tone === 'warn'
        ? colors.warning
        : colors.success;

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
        <Text variant="h2" style={{ color: colors.textPrimary }}>
          Bills
        </Text>
        <PressableScale
          onPress={() => setShowAdd(true)}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Add a bill"
        >
          <Plus color={colors.textPrimary} size={24} />
        </PressableScale>
      </View>

      <ScrollView
        // flex:1 is load-bearing. Without it a ScrollView inside a flex column
        // sizes to its own content, overflows the parent, and concludes it is
        // fully visible — so it refuses to scroll and everything below the fold
        // becomes unreachable. That is exactly what happened here: the
        // Subscriptions section could not be reached at all.
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primaryAccent}
            colors={[colors.primaryAccent]}
          />
        }
      >
        {hasBills ? (
          <>
            {/* ZONE 1: Safe to Spend Dashboard — the hero, counts up from 0. */}
            <Animated.View
              entering={FadeInDown.springify().reduceMotion(EXPRESSIVE)}
              style={[
                styles.safeToSpendCard,
                { backgroundColor: colors.card },
                cardShadow,
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <ShieldCheck color={heroTone} size={20} style={{ marginRight: 8 }} />
                <Text
                  variant="caption"
                  style={{
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    fontFamily: 'Satoshi-Bold',
                    fontSize: 11,
                  }}
                >
                  Due this month
                </Text>
              </View>

              {/* No `alignItems: 'baseline'` — with a CountUp inside, that
                  makes Yoga measure a Text baseline against a sealed shadow
                  node and aborts the process under the New Architecture. Same
                  crash the Goals hero hit; single child, so it did nothing. */}
              <View
                style={{
                  flexDirection: 'row',
                  marginBottom: 8,
                }}
              >
                <CountUp
                  value={summary.unpaidPaise}
                  delay={200}
                  prefix="₹"
                  isPaise
                  style={[styles.heroValue, { color: heroTone }]}
                />
              </View>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                {summary.headline}
              </Text>

              <View
                style={[styles.incomeRow, { backgroundColor: colors.chipBg }]}
              >
                <View style={styles.incomeItem}>
                  <Text
                    style={[
                      styles.incomeLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Monthly plan
                  </Text>
                  <CountUp
                    value={safeToSpendPaise}
                    delay={400}
                    prefix="₹"
                    isPaise
                    style={[styles.incomeValue, { color: colors.textPrimary }]}
                  />
                </View>
                <View
                  style={[
                    styles.incomeDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.incomeItem}>
                  <Text
                    style={[
                      styles.incomeLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Paid so far
                  </Text>
                  <CountUp
                    value={summary.paidPaise}
                    delay={450}
                    prefix="₹"
                    isPaise
                    style={[styles.incomeValue, { color: colors.textPrimary }]}
                  />
                </View>
              </View>
            </Animated.View>

            {/* ZONE 2: Immediate Attention */}
            {urgentBills.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(400)
                  .springify()
                  .reduceMotion(EXPRESSIVE)}
                style={styles.sectionContainer}
              >
                <View style={styles.sectionHeader}>
                  <AlertCircle
                    color={colors.danger}
                    size={20}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="h3"
                    style={{
                      color: colors.danger,
                      fontFamily: 'Satoshi-Black',
                    }}
                  >
                    Needs Attention
                  </Text>
                </View>
                {urgentBills.map(b => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    cardRadius={cardRadius}
                    cardShadow={cardShadow}
                    iconContainerRadius={iconContainerRadius}
                    onMarkPaid={() => handleMarkPaid(b.id)}
                    onMenu={() => handleMenu(b)}
                  />
                ))}
              </Animated.View>
            )}

            {/* ZONE 3: Mini Calendar (Timeline) */}
            <Animated.View
              entering={FadeInDown.delay(450)
                .springify()
                .reduceMotion(EXPRESSIVE)}
              style={styles.sectionContainer}
            >
              <View style={styles.sectionHeader}>
                <CalendarIcon
                  color={colors.textPrimary}
                  size={20}
                  style={{ marginRight: 8 }}
                />
                <Text variant="h3" style={{ color: colors.textPrimary }}>
                  This Month
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calendarScroll}
              >
                {Array.from({ length: daysInMonth(now) }, (_, i) => i + 1).map(day => {
                  const dayBills = bills.filter(b => b.dueDay === day);
                  const hasBillsOnDay = dayBills.length > 0;
                  const allPaid =
                    hasBillsOnDay &&
                    dayBills.every(b => isPaidForCycle(b, now));
                  // Mirrors the Needs Attention list above: any unpaid bill due on
                  // or before today+2 gets the danger dot. One predicate powers
                  // both the list and the calendar, so they can't drift.
                  // Same predicate as the Needs Attention list above, so the
                  // dots and the list can never disagree.
                  const needsAction = dayBills.some(b => {
                    const s2 = billStatus(b, now);
                    return s2 === 'overdue' || s2 === 'due-soon';
                  });

                  let dotColor = 'transparent';
                  if (needsAction) dotColor = colors.danger;
                  else if (allPaid) dotColor = colors.success;
                  else if (hasBillsOnDay) dotColor = colors.primaryAccent;

                  return (
                    <View
                      key={day}
                      style={[
                        styles.calendarDay,
                        day === today && {
                          backgroundColor: colors.chipBg,
                          borderRadius: chipRadius,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          {
                            color:
                              day === today
                                ? colors.textPrimary
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                      <View
                        style={[
                          styles.calendarDot,
                          { backgroundColor: dotColor },
                        ]}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* ZONE 4: Subscriptions */}
            {subscriptions.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(500)
                  .springify()
                  .reduceMotion(EXPRESSIVE)}
                style={styles.sectionContainer}
              >
                <Text
                  variant="h3"
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Subscriptions
                </Text>
                {subscriptions.map(b => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    cardRadius={cardRadius}
                    cardShadow={cardShadow}
                    iconContainerRadius={iconContainerRadius}
                    onMarkPaid={() => handleMarkPaid(b.id)}
                    onMenu={() => handleMenu(b)}
                  />
                ))}
              </Animated.View>
            )}

            {/* ZONE 5: Utilities */}
            {utilities.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(550)
                  .springify()
                  .reduceMotion(EXPRESSIVE)}
                style={styles.sectionContainer}
              >
                <Text
                  variant="h3"
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Essential Utilities
                </Text>
                {utilities.map(b => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    cardRadius={cardRadius}
                    cardShadow={cardShadow}
                    iconContainerRadius={iconContainerRadius}
                    onMarkPaid={() => handleMarkPaid(b.id)}
                    onMenu={() => handleMenu(b)}
                  />
                ))}
              </Animated.View>
            )}
          </>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(100)
              .springify()
              .reduceMotion(EXPRESSIVE)}
            style={styles.emptyState}
          >
            <View
              style={[styles.emptyIcon, { borderColor: colors.primaryAccent }]}
            >
              <CheckCircle2
                color={colors.primaryAccent}
                size={56}
                strokeWidth={1.5}
              />
            </View>
            <Text
              variant="h2"
              style={{
                color: colors.textPrimary,
                marginTop: 24,
                textAlign: 'center',
              }}
            >
              Start your bill list
            </Text>
            <Text
              variant="body"
              style={{
                color: colors.textSecondary,
                marginTop: 8,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Add your first one — rent, Wi-Fi, a subscription — and we'll track
              the due dates so nothing sneaks up on you.
            </Text>
            <PressableScale
              onPress={() => setShowAdd(true)}
              haptic="impactLight"
              style={[
                styles.emptyCta,
                { backgroundColor: colors.primaryAccent },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add your first bill"
            >
              <Plus color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.emptyCtaText}>Add your first bill</Text>
            </PressableScale>
          </Animated.View>
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

const makeStyles = (cardRadius: number, chipBg: string) =>
  StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
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
      borderRadius: 24,
      backgroundColor: chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      // The floating capsule tab bar overlaps the bottom of every screen, so
      // content needs real clearance beneath it. A flat 40 left the last
      // section permanently trapped under the bar. 144 is the clearance the
      // rest of the app uses (see DESIGN.md §7).
      paddingBottom: 144,
    },
    safeToSpendCard: {
      marginHorizontal: 24,
      marginBottom: 32,
      padding: 24,
      borderRadius: cardRadius,
    },
    heroValue: {
      fontSize: 48,
      fontFamily: 'Satoshi-Black',
      letterSpacing: -0.5,
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
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 48,
    },
    emptyIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 32,
      paddingHorizontal: 24,
      height: 56,
      borderRadius: 16,
    },
    emptyCtaText: {
      color: '#FFFFFF',
      fontFamily: 'Satoshi-Bold',
      fontSize: 16,
    },
  });
