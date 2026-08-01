/**
 * KazaScreen - Kaza (قضاء) Prayer Tracker
 * Spec Theme
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Info,
  Minus,
  Plus,
  CircleCheck,
  AlarmClockOff,
  Calculator,
  Clock,
  Bell,
  X,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';
import { useKazaStore, KazaPrayer } from '../../store/kazaStore';
import { getPreference, setPreference } from '../../store/database';
import { PressableScale, CountUp } from '../../components/anim';

const RING_SIZE = 168;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type QuickAction = 'missed' | 'madeUp' | null;
type SettingsModal = 'initial' | 'time' | null;

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const KazaScreen: React.FC<any> = () => {
  const insets = useSafeAreaInsets();
  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const { colors, cardRadius, cardShadow, iconShadow } = useSpecTheme();
  const { prayers, weeklyMadeUp, loadKaza, missedPrayer, makeUpPrayer, undoMakeUp, setInitialPending } =
    useKazaStore();

  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [settingsModal, setSettingsModal] = useState<SettingsModal>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:30');
  const [initialYears, setInitialYears] = useState('');

  useEffect(() => {
    loadKaza();
  }, [loadKaza]);

  useEffect(() => {
    const hydrate = async () => {
      const enabled = await getPreference('kazaReminderEnabled');
      if (enabled !== null) setReminderEnabled(enabled === 'on');
      const time = await getPreference('kazaReminderTime');
      if (time !== null) setReminderTime(time);
    };
    hydrate();
  }, []);

  const totals = useMemo(() => {
    const completed = prayers.reduce((sum, p) => sum + p.completed, 0);
    const pending = prayers.reduce((sum, p) => sum + p.pending, 0);
    const total = completed + pending;
    const progress = total > 0 ? completed / total : 0;
    return { completed, pending, total, progress };
  }, [prayers]);

  const st = useMemo(() => makeStyles(colors, cardRadius, cardShadow), [colors, cardRadius, cardShadow]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      'What is Kaza?',
      'Kaza (قضاء) means making up prayers that were missed. This tracker helps you count pending prayers per salah and log each one you make up.',
    );
  }, []);

  const handleMakeUp = useCallback(
    (name: string) => {
      const prayer = prayers.find(p => p.name === name);
      if (!prayer || prayer.pending <= 0) return;
      makeUpPrayer(name);
      if (prayer.pending - 1 === 0) {
        ReactNativeHapticFeedback.trigger('notificationSuccess');
      }
    },
    [prayers, makeUpPrayer],
  );

  const handleUndo = useCallback(
    (name: string) => {
      const prayer = prayers.find(p => p.name === name);
      if (!prayer || prayer.completed <= 0) return;
      undoMakeUp(name);
    },
    [prayers, undoMakeUp],
  );

  const handleMissed = useCallback(
    (name: string) => {
      missedPrayer(name);
    },
    [missedPrayer],
  );

  const handleQuickActionSelect = useCallback(
    (name: string) => {
      if (quickAction === 'missed') {
        handleMissed(name);
      } else if (quickAction === 'madeUp') {
        handleMakeUp(name);
      }
      setQuickAction(null);
    },
    [quickAction, handleMissed, handleMakeUp],
  );

  const handleToggleReminder = useCallback(async (val: boolean) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setReminderEnabled(val);
    try {
      await setPreference('kazaReminderEnabled', val ? 'on' : 'off');
    } catch (error) {
      console.error('[KazaScreen] Error saving reminder preference:', error);
    }
  }, []);

  const openInitialModal = useCallback(() => {
    setInitialYears('');
    setSettingsModal('initial');
  }, []);

  const openTimeModal = useCallback(() => {
    setSettingsModal('time');
  }, []);

  const saveInitialPending = useCallback(async () => {
    const years = parseFloat(initialYears);
    if (!Number.isFinite(years) || years <= 0) {
      setSettingsModal(null);
      return;
    }
    ReactNativeHapticFeedback.trigger('impactMedium');
    await setInitialPending(years);
    setSettingsModal(null);
  }, [initialYears, setInitialPending]);

  const saveReminderTime = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    try {
      await setPreference('kazaReminderTime', reminderTime);
    } catch (error) {
      console.error('[KazaScreen] Error saving reminder time:', error);
    }
    setSettingsModal(null);
  }, [reminderTime]);

  const adjustTime = useCallback((unit: 'hour' | 'minute', delta: number) => {
    setReminderTime(prev => {
      const [h, m] = prev.split(':').map(Number);
      let hour = h;
      let minute = m;
      if (unit === 'hour') {
        hour = (hour + delta + 24) % 24;
      } else {
        minute = (minute + delta + 60) % 60;
      }
      return `${pad2(hour)}:${pad2(minute)}`;
    });
  }, []);

  const yearsNum = parseFloat(initialYears) || 0;

  return (
    <View style={st.root}>
      <Animated.ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* ═══════════════════ HEADER ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={st.header}>
          <Text style={st.title}>Kaza Tracker</Text>
          <View>
            <PressableScale onPress={handleInfo} hitSlop={8} style={[st.infoButton, iconShadow]}>
              <Info size={20} color={colors.textSecondary} strokeWidth={2} />
            </PressableScale>
          </View>
        </Animated.View>

        {/* ═══════════════════ PROGRESS RING CARD ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={st.ringCard}>
          <View style={st.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.chipBg}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.primaryAccent}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRCUMFERENCE}, ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - totals.progress)}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={st.ringCenter}>
              <Text style={st.ringCenterValue}>
                <CountUp value={totals.completed} /> of {totals.total}
              </Text>
              <Text style={st.ringCenterLabel}>prayers completed</Text>
            </View>
          </View>

          <Text style={[st.weeklyText, { color: weeklyMadeUp > 0 ? colors.success : colors.textSecondary }]}>
            {weeklyMadeUp > 0
              ? `You've made up ${weeklyMadeUp} prayers this week`
              : "Log your first make-up prayer this week"}
          </Text>
        </Animated.View>

        {/* ═══════════════════ PRAYER LIST ═══════════════════ */}
        <View style={st.section}>
          <View style={st.prayerCard}>
            {prayers.map((prayer, i) => (
              <PrayerRow
                key={prayer.name}
                prayer={prayer}
                isLast={i === prayers.length - 1}
                colors={colors}
                iconShadow={iconShadow}
                onPlus={() => handleMakeUp(prayer.name)}
                onMinus={() => handleUndo(prayer.name)}
              />
            ))}
          </View>
        </View>

        {/* ═══════════════════ QUICK ACTIONS ═══════════════════ */}
        <View style={st.section}>
          <View style={st.prayerCard}>
            <PressableScale
              onPress={() => setQuickAction('missed')}
              style={[styles.settingItem, styles.settingItemBorder(colors)]}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${colors.danger}1F` }, iconShadow]}>
                <AlarmClockOff size={18} color={colors.danger} strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>I missed a prayer today</Text>
            </PressableScale>
            <PressableScale
              onPress={() => setQuickAction('madeUp')}
              style={styles.settingItem}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${colors.success}1F` }, iconShadow]}>
                <CircleCheck size={18} color={colors.success} strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>I made up a prayer</Text>
            </PressableScale>
          </View>
        </View>

        {/* ═══════════════════ SETTINGS ═══════════════════ */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={st.groupTitle}>KAZA SETTINGS</Text>
          <View style={st.prayerCard}>
            <PressableScale onPress={openInitialModal} style={[styles.settingItem, styles.settingItemBorder(colors)]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.chipBg }, iconShadow]}>
                <Calculator size={18} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Set Initial Pending</Text>
            </PressableScale>

            <PressableScale onPress={openTimeModal} style={[styles.settingItem, styles.settingItemBorder(colors)]}>
              <View style={[styles.settingIcon, { backgroundColor: colors.chipBg }, iconShadow]}>
                <Clock size={18} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Daily Reminder Time</Text>
              <Text style={[st.settingValue]}>{reminderTime}</Text>
            </PressableScale>

            <View style={styles.settingItem}>
              <View style={[styles.settingIcon, { backgroundColor: colors.chipBg }, iconShadow]}>
                <Bell size={18} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Remind me to make up Kaza</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.inputBg, true: colors.success }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Quick action selector modal */}
      <Modal visible={quickAction !== null} transparent animationType="slide" onRequestClose={() => setQuickAction(null)}>
        <Pressable style={st.modalOverlay} onPress={() => setQuickAction(null)}>
          <Pressable style={st.sheet} onPress={e => e.stopPropagation()}>
            <Text style={st.sheetTitle}>
              {quickAction === 'missed' ? 'Which prayer did you miss?' : 'Which prayer did you make up?'}
            </Text>
            {prayers.map(prayer => (
              <PressableScale
                key={prayer.name}
                onPress={() => handleQuickActionSelect(prayer.name)}
                style={[styles.settingItem, styles.settingItemBorder(colors)]}
              >
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{prayer.name}</Text>
                <Text style={st.sheetArabic}>{prayer.arabic}</Text>
              </PressableScale>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Set Initial Pending modal */}
      <Modal
        visible={settingsModal === 'initial'}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModal(null)}
      >
        <Pressable style={st.modalOverlay} onPress={() => setSettingsModal(null)}>
          <Pressable style={st.sheet} onPress={e => e.stopPropagation()}>
            <View style={st.sheetHeaderRow}>
              <Text style={st.sheetTitle}>Set Initial Pending</Text>
              <PressableScale onPress={() => setSettingsModal(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </PressableScale>
            </View>
            <Text style={st.inputLabel}>Years of missed prayers</Text>
            <TextInput
              value={initialYears}
              onChangeText={setInitialYears}
              placeholder="e.g. 2"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={st.textInput}
            />
            <Text style={st.helperText}>
              ≈ {Math.round(yearsNum * 365)} per prayer · {Math.round(yearsNum * 5 * 365)} total
            </Text>
            <PressableScale onPress={saveInitialPending} haptic="none" style={st.saveButton}>
              <Text style={st.saveButtonText}>Save</Text>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Daily Reminder Time modal */}
      <Modal
        visible={settingsModal === 'time'}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModal(null)}
      >
        <Pressable style={st.modalOverlay} onPress={() => setSettingsModal(null)}>
          <Pressable style={st.sheet} onPress={e => e.stopPropagation()}>
            <View style={st.sheetHeaderRow}>
              <Text style={st.sheetTitle}>Daily Reminder Time</Text>
              <PressableScale onPress={() => setSettingsModal(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </PressableScale>
            </View>

            <View style={st.stepperRow}>
              <View style={st.stepperGroup}>
                <PressableScale onPress={() => adjustTime('hour', -1)} style={[st.stepperButton, iconShadow]}>
                  <Minus size={18} color={colors.textSecondary} strokeWidth={2} />
                </PressableScale>
                <Text style={st.stepperValue}>{reminderTime.split(':')[0]}</Text>
                <PressableScale onPress={() => adjustTime('hour', 1)} style={[st.stepperButton, iconShadow]}>
                  <Plus size={18} color={colors.textSecondary} strokeWidth={2} />
                </PressableScale>
              </View>
              <Text style={st.stepperColon}>:</Text>
              <View style={st.stepperGroup}>
                <PressableScale onPress={() => adjustTime('minute', -5)} style={[st.stepperButton, iconShadow]}>
                  <Minus size={18} color={colors.textSecondary} strokeWidth={2} />
                </PressableScale>
                <Text style={st.stepperValue}>{reminderTime.split(':')[1]}</Text>
                <PressableScale onPress={() => adjustTime('minute', 5)} style={[st.stepperButton, iconShadow]}>
                  <Plus size={18} color={colors.textSecondary} strokeWidth={2} />
                </PressableScale>
              </View>
            </View>

            <PressableScale onPress={saveReminderTime} haptic="none" style={st.saveButton}>
              <Text style={st.saveButtonText}>Save</Text>
            </PressableScale>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

/* ── Prayer Row ── */
const PrayerRow: React.FC<{
  prayer: KazaPrayer;
  isLast: boolean;
  colors: any;
  iconShadow: any;
  onPlus: () => void;
  onMinus: () => void;
}> = ({ prayer, isLast, colors, iconShadow, onPlus, onMinus }) => {
  const isComplete = prayer.pending === 0 && prayer.completed > 0;
  const nameColor = isComplete ? colors.success : colors.textPrimary;

  return (
    <View style={[rowStyles.row, !isLast && rowStyles.rowBorder(colors)]}>
      <View style={rowStyles.left}>
        <View style={rowStyles.nameRow}>
          {isComplete && <CircleCheck size={15} color={colors.success} strokeWidth={2} style={rowStyles.checkIcon} />}
          <Text style={[rowStyles.name, { color: nameColor }]} numberOfLines={1}>
            {prayer.name}
          </Text>
        </View>
        <Text style={[rowStyles.arabic, { color: colors.textSecondary }]}>{prayer.arabic}</Text>
        <Text style={[rowStyles.counts, { color: colors.textSecondary }]}>
          Completed: {prayer.completed} · Pending: {prayer.pending}
        </Text>
      </View>

      <View style={rowStyles.actions}>
        <PressableScale
          onPress={onMinus}
          disabled={prayer.completed === 0}
          style={[
            rowStyles.actionButton,
            { backgroundColor: colors.chipBg },
            iconShadow,
            prayer.completed === 0 && rowStyles.disabled,
          ]}
        >
          <Minus size={16} color={colors.textSecondary} strokeWidth={2} />
        </PressableScale>
        <PressableScale
          onPress={onPlus}
          disabled={prayer.pending === 0}
          style={[
            rowStyles.actionButton,
            { backgroundColor: colors.primaryAccent },
            iconShadow,
            prayer.pending === 0 && rowStyles.disabled,
          ]}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2} />
        </PressableScale>
      </View>
    </View>
  );
};

/* ── Static styles ── */
const styles = {
  settingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
  },
  settingItemBorder: (colors: any) => ({
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBg,
  }),
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
    flex: 1,
  },
};

const rowStyles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  rowBorder: (colors: any) => ({
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBg,
  }),
  left: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  checkIcon: { marginRight: 6 },
  name: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  arabic: { fontSize: 13, fontFamily: 'Satoshi-Regular', marginTop: 2 },
  counts: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginTop: 6 },
  actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  disabled: { opacity: 0.4 },
};

const makeStyles = (colors: any, cardRadius: number, cardShadow: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 24 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    title: { fontSize: 26, fontFamily: 'Satoshi-Black', color: colors.textPrimary },
    infoButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.chipBg,
      justifyContent: 'center',
      alignItems: 'center',
    },

    ringCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 20,
      marginBottom: 32,
      alignItems: 'center',
      ...cardShadow,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    ringCenterValue: { fontSize: 28, fontFamily: 'Satoshi-Black', color: colors.textPrimary },
    ringCenterLabel: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: colors.textSecondary, marginTop: 2 },
    weeklyText: {
      fontSize: 13,
      fontFamily: 'Satoshi-Bold',
      marginTop: 16,
      textAlign: 'center',
    },

    section: { marginBottom: 32 },
    prayerCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      overflow: 'hidden',
      paddingHorizontal: 16,
      ...cardShadow,
    },

    groupTitle: {
      fontSize: 13,
      fontFamily: 'Satoshi-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    settingValue: {
      fontSize: 13,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 32,
    },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    sheetArabic: {
      fontSize: 13,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },

    inputLabel: {
      fontSize: 13,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    helperText: {
      fontSize: 12,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
      marginBottom: 20,
    },
    saveButton: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: '#FFFFFF',
    },

    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    stepperGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.chipBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepperValue: {
      fontSize: 24,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      minWidth: 40,
      textAlign: 'center',
    },
    stepperColon: {
      fontSize: 24,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      marginHorizontal: 12,
    },
  });

export default KazaScreen;
