/**
 * KazaScreen - Kaza (قضاء) Prayer Tracker
 * Kaza theme ("Dawn to Night") — see theme/kazaTheme.ts and DESIGN.md §11.
 *
 * Flow: see how much is left → log what you made up (one tap, or several at
 * once) → watch the streak, history and milestones build. Streak rules live in
 * services/kazaStreak, preferences in hooks/useKazaPrefs, and every sheet is
 * its own component; this file only composes them.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlarmClockOff,
  Calculator,
  ListPlus,
  Settings,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useKazaTheme } from '../../theme/kazaTheme';
import { useKazaStore, MakeUpEntry } from '../../store/kazaStore';
import { setPreference } from '../../store/database';
import { useKazaPrefs } from '../../hooks/useKazaPrefs';
import { PressableScale, BadgeCelebration } from '../../components/anim';
import { daysToFinish } from '../../services/kazaPlan';
import {
  chapterProgress,
  groupActivity,
  pickReflection,
  weekStats,
} from '../../services/kazaInsights';
import {
  buildHeatmap,
  buildMilestones,
  dayKey,
  finishDate,
  nextPrayerInOrder,
} from '../../services/kazaStreak';
import { KazaStreakCard } from '../../components/kaza/KazaStreakCard';
import { KazaHeatmap } from '../../components/kaza/KazaHeatmap';
import { KazaMilestones } from '../../components/kaza/KazaMilestones';
import { KazaLogSheet } from '../../components/kaza/KazaLogSheet';
import { KazaRestSheet } from '../../components/kaza/KazaRestSheet';
import { KazaPrayerRow } from '../../components/kaza/KazaPrayerRow';
import { KazaHero } from '../../components/kaza/KazaHero';
import { KazaReflection } from '../../components/kaza/KazaReflection';
import { KazaStats } from '../../components/kaza/KazaStats';
import { KazaJourney } from '../../components/kaza/KazaJourney';
import { KazaPlanSheet } from '../../components/kaza/KazaPlanSheet';
import { KazaAdjustSheet } from '../../components/kaza/KazaAdjustSheet';
import { KazaSettingsSheet } from '../../components/kaza/KazaSettingsSheet';
import { KazaCalculatorSheet } from '../../components/kaza/KazaCalculatorSheet';
import { KazaTimeSheet } from '../../components/kaza/KazaTimeSheet';
import { KazaMissedSheet } from '../../components/kaza/KazaMissedSheet';
import { KazaAboutSheet } from '../../components/kaza/KazaAboutSheet';

type Sheet =
  | 'log'
  | 'missed'
  | 'rest'
  | 'calculator'
  | 'time'
  | 'plan'
  | 'adjust'
  | 'settings'
  | 'about'
  | null;

type Celebration = {
  label: string;
  earnedFor: string;
  icon: 'Flame' | 'Trophy' | 'Medal';
};

const celebrationIcon = (id: string): Celebration['icon'] =>
  id.startsWith('streak')
    ? 'Flame'
    : id.startsWith('count')
    ? 'Medal'
    : 'Trophy';

export const KazaScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const { colors, cardRadius, cardShadow } = useKazaTheme();
  const {
    prayers: allPrayers,
    loading,
    madeUpToday,
    totalMadeUp,
    dailyCounts,
    restDays,
    streak,
    recent,
    lastLogged,
    loadKaza,
    missedPrayer,
    makeUpPrayer,
    logMakeUp,
    undoMakeUp,
    setEstimate,
    setPending,
    takeRestDays,
    endRest,
  } = useKazaStore();
  const prefs = useKazaPrefs();
  const { dailyGoal, hydrated, seenMilestones } = prefs;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // Editing counts (Adjust) is not an achievement: no celebration for it.
  const suppressCelebrationUntil = useRef(0);

  // Witr is wajib in the Hanafi school only, so it stays out of every count
  // until the user opts in.
  const prayers = useMemo(
    () => allPrayers.filter(p => prefs.includeWitr || p.name !== 'Witr'),
    [allPrayers, prefs.includeWitr],
  );

  useEffect(() => {
    loadKaza();
  }, [loadKaza]);

  const totals = useMemo(() => {
    const completed = prayers.reduce((sum, p) => sum + p.completed, 0);
    const pending = prayers.reduce((sum, p) => sum + p.pending, 0);
    const total = completed + pending;
    return {
      completed,
      pending,
      total,
      finishInDays: daysToFinish(pending, dailyGoal),
    };
  }, [prayers, dailyGoal]);

  const finishOn = useMemo(
    () => finishDate(totals.pending, dailyGoal),
    [totals.pending, dailyGoal],
  );
  const heatmap = useMemo(
    () => buildHeatmap(dailyCounts, restDays, dailyGoal),
    [dailyCounts, restDays, dailyGoal],
  );
  const milestones = useMemo(
    () =>
      buildMilestones({ longestStreak: streak.longest, totalMadeUp, prayers }),
    [streak.longest, totalMadeUp, prayers],
  );
  const chapter = useMemo(
    () =>
      chapterProgress(
        totals.completed,
        totals.total,
        Math.max(1, prayers.length),
      ),
    [totals.completed, totals.total, prayers.length],
  );
  const stats = useMemo(() => weekStats(dailyCounts), [dailyCounts]);
  const activity = useMemo(() => groupActivity(recent), [recent]);
  const reflection = useMemo(
    () =>
      pickReflection({
        streakBroken: streak.broken,
        streakAtRisk: streak.atRisk,
        pending: totals.pending,
        hasStarted: totalMadeUp > 0,
      }),
    [streak.broken, streak.atRisk, totals.pending, totalMadeUp],
  );
  // The prayer with the most left — only named when it clearly stands apart.
  const mostBehind = useMemo(() => {
    const byLeft = [...prayers].sort((a, b) => b.pending - a.pending);
    return byLeft.length > 1 && byLeft[0].pending > byLeft[1].pending
      ? byLeft[0].name
      : null;
  }, [prayers]);
  const suggested = useMemo(
    () => nextPrayerInOrder(lastLogged, prayers),
    [lastLogged, prayers],
  );
  const resting = restDays.includes(dayKey(new Date()));

  // One quiet celebration per newly earned milestone. The first run seeds the
  // seen-set silently, so an existing backlog never fires a pile of badges.
  useEffect(() => {
    if (loading || !hydrated) return;
    const achieved = milestones.filter(m => m.achieved);
    const persist = (ids: string[]) =>
      setPreference('kazaMilestonesSeen', JSON.stringify(ids)).catch(() => {});

    if (seenMilestones.current === null) {
      seenMilestones.current = new Set(achieved.map(m => m.id));
      persist([...seenMilestones.current]);
      return;
    }
    const fresh = achieved.filter(m => !seenMilestones.current!.has(m.id));
    if (fresh.length === 0) return;
    if (Date.now() < suppressCelebrationUntil.current) {
      fresh.forEach(m => seenMilestones.current!.add(m.id));
      persist([...seenMilestones.current]);
      return;
    }

    // The list runs counts → streaks → cleared, so the last is the biggest.
    const top = fresh[fresh.length - 1];
    achieved.forEach(m => seenMilestones.current!.add(m.id));
    persist([...seenMilestones.current]);
    setCelebration({
      label: top.title,
      earnedFor: top.detail,
      icon: celebrationIcon(top.id),
    });
  }, [milestones, loading, hydrated, seenMilestones]);

  const closeSheet = useCallback(() => setSheet(null), []);

  const handleMakeUp = useCallback(
    (name: string) => {
      const prayer = prayers.find(p => p.name === name);
      if (!prayer || prayer.pending <= 0) return;
      ReactNativeHapticFeedback.trigger(
        prayer.pending === 1 ? 'notificationSuccess' : 'impactLight',
      );
      makeUpPrayer(name);
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

  const handleLogConfirm = useCallback(
    async (entries: MakeUpEntry[], daysAgo: number) => {
      setSheet(null);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      await logMakeUp(entries, daysAgo);
    },
    [logMakeUp],
  );

  const handleMissed = useCallback(
    (name: string) => {
      setSheet(null);
      missedPrayer(name);
    },
    [missedPrayer],
  );

  const handleRest = useCallback(
    async (days: number) => {
      setSheet(null);
      ReactNativeHapticFeedback.trigger('impactMedium');
      await takeRestDays(days);
    },
    [takeRestDays],
  );

  const handleEstimate = useCallback(
    async (missedDays: number) => {
      setSheet(null);
      if (missedDays <= 0) return;
      ReactNativeHapticFeedback.trigger('impactMedium');
      await setEstimate(
        missedDays,
        prayers.map(p => p.name),
      );
    },
    [prayers, setEstimate],
  );

  const handlePickPace = useCallback(
    (perDay: number) => {
      ReactNativeHapticFeedback.trigger('impactMedium');
      prefs.setGoal(perDay);
      setSheet(null);
    },
    [prefs],
  );

  const handleAdjust = useCallback(
    async (entries: { name: string; pending: number }[]) => {
      setSheet(null);
      ReactNativeHapticFeedback.trigger('impactMedium');
      suppressCelebrationUntil.current = Date.now() + 3000;
      for (const entry of entries) await setPending(entry.name, entry.pending);
    },
    [setPending],
  );

  const st = useMemo(
    () => makeStyles(colors, cardRadius, cardShadow),
    [colors, cardRadius, cardShadow],
  );
  const hasKaza = totals.total > 0;

  return (
    <View style={st.root}>
      <Animated.ScrollView
        style={st.scroll}
        contentContainerStyle={[
          st.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 144 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={st.header}>
          <Text style={st.title} accessibilityRole="header">
            Kaza
          </Text>
          <PressableScale
            onPress={() => setSheet('settings')}
            accessibilityRole="button"
            accessibilityLabel="Kaza settings"
            style={st.headerButton}
          >
            <Settings size={20} color={colors.textPrimary} strokeWidth={2} />
          </PressableScale>
        </View>

        {hasKaza ? (
          <KazaHero
            pending={totals.pending}
            completed={totals.completed}
            total={totals.total}
            chapter={chapter}
            dailyGoal={dailyGoal}
            finishOn={finishOn}
            onPlan={() => setSheet('plan')}
          />
        ) : loading ? null : (
          <View style={st.emptyCard}>
            <View style={st.emptyIcon}>
              <Calculator size={22} color={colors.onAccent} strokeWidth={2} />
            </View>
            <Text style={st.emptyTitle}>Start with an estimate</Text>
            <Text style={st.helperText}>
              Tell us when you started praying regularly and we&apos;ll work out
              how many to make up. You can adjust it any time.
            </Text>
            <PressableScale
              onPress={() => setSheet('calculator')}
              haptic="none"
              accessibilityRole="button"
              style={st.emptyButton}
            >
              <Text style={st.emptyButtonText}>Calculate my Kaza</Text>
            </PressableScale>
          </View>
        )}

        {hasKaza && (
          <>
            <View style={st.actions}>
              <PressableScale
                onPress={() => setSheet('log')}
                haptic="none"
                accessibilityRole="button"
                style={st.primaryAction}
                testID="kaza-log"
              >
                <ListPlus size={18} color={colors.onAccent} strokeWidth={2.2} />
                <Text style={st.primaryActionText}>Log made-up prayers</Text>
              </PressableScale>
              <PressableScale
                onPress={() => setSheet('missed')}
                accessibilityRole="button"
                style={st.secondaryAction}
                testID="kaza-missed"
              >
                <AlarmClockOff
                  size={18}
                  color={colors.textPrimary}
                  strokeWidth={2}
                />
                <Text style={st.secondaryActionText}>I missed one</Text>
              </PressableScale>
            </View>

            <Text style={st.sectionTitle} accessibilityRole="header">
              Prayers
            </Text>
            <View style={st.prayerCard}>
              {prayers.map((prayer, i) => (
                <KazaPrayerRow
                  key={prayer.name}
                  prayer={prayer}
                  isLast={i === prayers.length - 1}
                  isNext={suggested === prayer.name}
                  isMostBehind={mostBehind === prayer.name}
                  onPlus={() => handleMakeUp(prayer.name)}
                  onMinus={() => handleUndo(prayer.name)}
                />
              ))}
            </View>

            <KazaStreakCard
              streak={streak}
              madeUpToday={madeUpToday}
              dailyGoal={dailyGoal}
              resting={resting}
              onRest={() => setSheet('rest')}
              onEndRest={endRest}
            />

            <KazaReflection reflection={reflection} />

            <Text style={st.sectionTitle} accessibilityRole="header">
              Your progress
            </Text>
            <KazaStats
              stats={stats}
              expanded={showHistory}
              onToggle={() => setShowHistory(v => !v)}
            />
            {showHistory && <KazaHeatmap weeks={heatmap} />}
            {showHistory && <KazaMilestones milestones={milestones} />}
            {showHistory && <KazaJourney days={activity} />}
          </>
        )}
      </Animated.ScrollView>

      <KazaSettingsSheet
        visible={sheet === 'settings'}
        dailyGoal={dailyGoal}
        includeWitr={prefs.includeWitr}
        reminderEnabled={prefs.reminderEnabled}
        reminderTime={prefs.reminderTime}
        onClose={closeSheet}
        onChangeGoal={prefs.changeGoal}
        onToggleWitr={prefs.toggleWitr}
        onToggleReminder={prefs.toggleReminder}
        onOpenCalculator={() => setSheet('calculator')}
        onOpenAdjust={() => setSheet('adjust')}
        onOpenTime={() => setSheet('time')}
        onOpenAbout={() => setSheet('about')}
      />

      <KazaLogSheet
        visible={sheet === 'log'}
        prayers={prayers}
        suggested={suggested}
        onClose={closeSheet}
        onConfirm={handleLogConfirm}
      />

      <KazaPlanSheet
        visible={sheet === 'plan'}
        pending={totals.pending}
        prayers={prayers}
        prayersPerDay={Math.max(1, prayers.length)}
        currentGoal={dailyGoal}
        recentAverage={stats.averagePerDay}
        onClose={closeSheet}
        onPick={handlePickPace}
      />

      <KazaAdjustSheet
        visible={sheet === 'adjust'}
        prayers={prayers}
        onClose={closeSheet}
        onSave={handleAdjust}
      />

      <KazaRestSheet
        visible={sheet === 'rest'}
        onClose={closeSheet}
        onConfirm={handleRest}
      />

      <KazaMissedSheet
        visible={sheet === 'missed'}
        prayers={prayers}
        onClose={closeSheet}
        onPick={handleMissed}
      />

      <KazaCalculatorSheet
        visible={sheet === 'calculator'}
        prayersPerDay={Math.max(1, prayers.length)}
        onClose={closeSheet}
        onSave={handleEstimate}
      />

      <KazaTimeSheet
        visible={sheet === 'time'}
        value={prefs.reminderTime}
        onClose={closeSheet}
        onSave={prefs.saveReminderTime}
      />

      <KazaAboutSheet visible={sheet === 'about'} onClose={closeSheet} />

      <BadgeCelebration
        badge={celebration}
        onDismiss={() => setCelebration(null)}
      />
    </View>
  );
};

const makeStyles = (
  colors: ReturnType<typeof useKazaTheme>['colors'],
  cardRadius: number,
  cardShadow: object,
) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    // One rhythm: 16 between cards, 32 between groups (a section title adds the other 16).
    content: { paddingHorizontal: 24, gap: 16 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontSize: 32,
      fontFamily: 'Satoshi-Black',
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },
    headerButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },

    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 24,
      ...cardShadow,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryAccent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 22,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    helperText: {
      fontSize: 14,
      lineHeight: 21,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
      marginBottom: 24,
    },
    emptyButton: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 999,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyButtonText: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.onAccent,
    },

    // Primary = the one action that matters (pill, accent fill). Secondary = a quiet chip.
    actions: { flexDirection: 'row', gap: 8 },
    primaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primaryAccent,
      borderRadius: 999,
      minHeight: 56,
      paddingHorizontal: 16,
    },
    primaryActionText: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.onAccent,
    },
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      minHeight: 56,
      paddingHorizontal: 16,
    },
    secondaryActionText: {
      fontSize: 14,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },

    // A group break is 32: the 16 content gap plus this title's 16 above.
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginTop: 16,
    },
    prayerCard: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      overflow: 'hidden',
      paddingHorizontal: 16,
      ...cardShadow,
    },
  });

export default KazaScreen;
