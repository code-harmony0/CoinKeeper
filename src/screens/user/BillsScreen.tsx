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
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { brand, onInk, useSpecTheme } from '../../theme/specTheme';
import { Bezel } from '../../components/shared/Bezel';
import { RollingNumber } from '../../components/anim/RollingNumber';
import { EXPRESSIVE, INFORMATIONAL } from '../../theme/motion';
import { useBillStore, Bill } from '../../store/billStore';
import { useTransactionStore } from '../../store/transactionStore';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import { PressableScale } from '../../components/anim';
import {
  scheduleBillReminder,
  cancelBillReminder,
} from '../../services/notificationService';
import { Money, toPaise } from '../../utils/money';
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

/** One line of progress: how much of this month's bills is already paid. */
const PaidBar: React.FC<{ paid: number; total: number }> = ({ paid, total }) => {
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const ratio = total > 0 ? paid / total : 0;
  useEffect(() => {
    p.value = withDelay(400, withTiming(Math.min(Math.max(ratio, 0.02), 1), { duration: 700, easing: Easing.bezier(0.32, 0.72, 0, 1), reduceMotion: INFORMATIONAL }));
  }, [ratio, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (p.value - 1) * w }] }));
  const styles = barStyles;
  if (total <= 0) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.barTrack} onLayout={e => setW(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.barFill, fill]} />
      </View>
      <Text style={styles.barText}>
        {Money.format(paid, { zeroDecimals: true })} paid of {Money.format(total, { zeroDecimals: true })} in bills
      </Text>
    </View>
  );
};

const barStyles = StyleSheet.create({
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: onInk.fill },
  barFill: { height: 8, width: '100%', borderRadius: 4, backgroundColor: brand.signal },
  barText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 8 },
});

export const BillsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, isDark } = useSpecTheme();
  const styles = React.useMemo(
    () => makeStyles(colors.chipBg),
    [colors.chipBg],
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

  const calRef = React.useRef<ScrollView>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const today = now.getDate();

  // One load path for mount and pull-to-refresh — bills, ledger and the
  // snapshot refresh together so the hero can never disagree with the list.
  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadBills(), loadTransactions()]);
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
  const hasBills = bills.length > 0;

  // The three-second answer on a bills screen is what is still owed — not the
  // month's budget, which belongs to the Money Plan and is already a tile on
  // Home. One fact, one place.
  const summary = billsSummary(bills, now);
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
            <Animated.View entering={FadeInDown.springify().reduceMotion(EXPRESSIVE)} style={styles.heroWrap}>
              <Bezel tone="ink" solid>
                <Text style={styles.heroLabel}>Still to pay this month</Text>
                <RollingNumber
                  valuePaise={summary.unpaidPaise}
                  fontSize={44}
                  lineHeight={52}
                  letterSpacing={-1.5}
                  color={summary.unpaidPaise === 0 ? onInk.high : brand.signal}
                />
                <Text style={styles.heroSub}>{summary.headline}</Text>
                <PaidBar paid={summary.paidPaise} total={summary.paidPaise + summary.unpaidPaise} />
              </Bezel>
            </Animated.View>

            {urgentBills.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(200).springify().reduceMotion(EXPRESSIVE)}
                style={styles.section}
              >
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                  Needs attention
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  Swipe a bill right to mark it paid.
                </Text>
                {urgentBills.map((b, i) => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    last={i === urgentBills.length - 1}
                    onMarkPaid={() => handleMarkPaid(b.id)}
                    onMenu={() => handleMenu(b)}
                  />
                ))}
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(260).springify().reduceMotion(EXPRESSIVE)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                This month
              </Text>
              <ScrollView
                horizontal
                ref={calRef}
                onLayout={() => calRef.current?.scrollTo({ x: Math.max(today - 3, 0) * 44, animated: false })}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calendarScroll}
              >
                {Array.from({ length: daysInMonth(now) }, (_, i) => i + 1).map(day => {
                  const dayBills = bills.filter(b => b.dueDay === day);
                  const hasBillsOnDay = dayBills.length > 0;
                  const allPaid = hasBillsOnDay && dayBills.every(b => isPaidForCycle(b, now));
                  // Same predicate as the Needs attention list, so dots and list never disagree.
                  const needsAction = dayBills.some(b => {
                    const s2 = billStatus(b, now);
                    return s2 === 'overdue' || s2 === 'due-soon';
                  });
                  let dotColor = 'transparent';
                  if (needsAction) dotColor = brand.alert;
                  else if (allPaid) dotColor = colors.success;
                  else if (hasBillsOnDay) dotColor = colors.textPrimary;
                  const isToday = day === today;
                  return (
                    <View
                      key={day}
                      style={[styles.calendarDay, { backgroundColor: isToday ? (isDark ? colors.chipBg : brand.ink) : 'transparent' }]}
                      accessible
                      accessibilityLabel={`${day}${hasBillsOnDay ? `, ${dayBills.length} bill${dayBills.length > 1 ? 's' : ''}` : ''}${isToday ? ', today' : ''}`}
                    >
                      <Text style={[styles.calendarDayText, { color: isToday ? '#FFFFFF' : colors.textSecondary }]}>{day}</Text>
                      <View style={[styles.calendarDot, { backgroundColor: dotColor }]} />
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {subscriptions.length > 0 && (
              <Animated.View entering={FadeInDown.delay(320).springify().reduceMotion(EXPRESSIVE)} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                  Subscriptions
                </Text>
                {subscriptions.map((b, i) => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    last={i === subscriptions.length - 1}
                    onMarkPaid={() => handleMarkPaid(b.id)}
                    onMenu={() => handleMenu(b)}
                  />
                ))}
              </Animated.View>
            )}

            {utilities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(380).springify().reduceMotion(EXPRESSIVE)} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                  Regular bills
                </Text>
                {utilities.map((b, i) => (
                  <SwipeableBillCard
                    key={b.id}
                    bill={b}
                    status={billStatus(b, now)}
                    colors={colors}
                    last={i === utilities.length - 1}
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

const makeStyles = (chipBg: string) =>
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
    heroWrap: { marginHorizontal: 24, marginBottom: 32 },
    heroLabel: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid },
    heroSub: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', color: onInk.mid, marginTop: 4 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold', marginBottom: 4 },
    sectionHint: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium', marginBottom: 8 },
    calendarScroll: { gap: 4, paddingRight: 24, paddingTop: 8 },
    calendarDay: { width: 40, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    calendarDayText: { fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 20, marginBottom: 4 },
    calendarDot: { width: 6, height: 6, borderRadius: 3 },
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
