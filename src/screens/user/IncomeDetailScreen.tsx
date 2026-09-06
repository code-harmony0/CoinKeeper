/**
 * IncomeDetailScreen — income health at reference depth.
 *
 * Home carries the summary card; this is where the pillars get defined, the
 * six months get numbers, and the sources get named. Income health is
 * reference material you consult a few times a year, not a daily decision, so
 * everything here is allowed to be slower and longer than home.
 *
 * Every figure on this screen is read from the ledger via useIncomeHealth —
 * the same hook the home card uses, so the two can never disagree.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Dimensions,
  Share,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Download,
  Layers,
  Plus,
  Share2,
  Target,
  TrendingUp,
} from 'lucide-react-native';

import { useSpecTheme, specLight } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { NextSalaryWidget } from '../../components/income/NextSalaryWidget';
import { IncomeInsightsWidget } from '../../components/income/IncomeInsightsWidget';
import {
  Donut,
  ScoreRing,
  ScoreText,
  bandColor,
} from '../../components/income/incomeVisuals';
import { IncomeTrendChart } from '../../components/income/IncomeTrendChart';
import { useIncomeHealth } from '../../hooks/useIncomeHealth';
import { NOT_ENOUGH_DATA } from '../../services/income/IncomeAnalyticsService';
import { verdictFor } from '../../services/income/incomeHealthCopy';
import { Money } from '../../utils/money';

const PILLAR_ICONS = { Activity, Layers, TrendingUp };

const SLICE_PALETTE = [
  specLight.lavenderDeep,
  specLight.pinkDeep,
  specLight.mintDeep,
  specLight.peachDeep,
  specLight.skyDeep,
];

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = SCREEN_W - 48;

export const IncomeDetailScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow, chipRadius } = useSpecTheme();
  const st = makeStyles(colors, cardRadius, chipRadius);
  const health = useIncomeHealth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { score, pillars, months, sources } = health;
  const totalIncomePaise = sources.reduce((s, x) => s + x.totalPaise, 0);

  const onShare = () => {
    const lines = [
      `Income Health: ${score === NOT_ENOUGH_DATA ? 'not yet scored' : `${score}/100`}`,
      verdictFor(score),
      ...pillars.map(
        p =>
          `${p.label}: ${p.score === NOT_ENOUGH_DATA ? 'not enough data' : p.score}`,
      ),
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {
      // A dismissed share sheet is not a failure worth reporting.
    });
  };

  return (
    <View style={st.root}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={st.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={st.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={st.title}>Income Health</Text>
          <PressableScale
            onPress={onShare}
            style={st.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Share income health summary"
          >
            <Share2 size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
        </Animated.View>

        <View style={st.stack}>
          {/* Score */}
          <Animated.View entering={FadeInDown.springify()} style={[st.card, cardShadow]}>
            <View style={st.scoreRow}>
              <ScoreRing score={score} colors={colors} size={150}>
                <ScoreText score={score} colors={colors} size={40} />
              </ScoreRing>
            </View>
            <Text style={st.verdict}>{verdictFor(score)}</Text>
            <View style={st.legend}>
              {[
                { label: '0–30', color: colors.danger },
                { label: '31–60', color: colors.warning },
                { label: '61–100', color: colors.success },
              ].map(band => (
                <View key={band.label} style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: band.color }]} />
                  <Text style={st.legendText}>{band.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Six-month trend */}
          {months.some(m => m.totalPaise > 0) && (
            <Animated.View
              entering={FadeInDown.springify().delay(60)}
              style={[st.card, cardShadow]}
            >
              <Text style={st.cardTitle}>Last 6 months</Text>
              <IncomeTrendChart months={months} width={CONTENT_W - 32} />
            </Animated.View>
          )}

          {/* Pillars */}
          <Animated.View
            entering={FadeInDown.springify().delay(120)}
            style={[st.card, cardShadow]}
          >
            <Text style={st.cardTitle}>What makes up the score</Text>
            <View style={st.pillarList}>
              {pillars.map(pillar => {
                const Icon = PILLAR_ICONS[pillar.icon];
                const open = expanded === pillar.key;
                const measured = pillar.score !== NOT_ENOUGH_DATA;
                return (
                  <View key={pillar.key} style={st.pillar}>
                    <View style={st.pillarHead}>
                      <View style={st.pillarIcon}>
                        <Icon
                          size={15}
                          color={colors.textSecondary}
                          strokeWidth={2.3}
                        />
                      </View>
                      <Text style={st.pillarName}>{pillar.label}</Text>
                      <Text
                        style={[
                          st.pillarScore,
                          {
                            color: measured
                              ? bandColor(pillar.score, colors)
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {measured ? pillar.score : 'Not yet'}
                      </Text>
                    </View>

                    <View style={st.pillarTrack}>
                      <View
                        style={[
                          st.pillarFill,
                          {
                            width: measured ? `${pillar.score}%` : '0%',
                            backgroundColor: bandColor(pillar.score, colors),
                          },
                        ]}
                      />
                    </View>

                    <Text style={st.pillarMeaning}>{pillar.meaning}</Text>

                    <PressableScale
                      onPress={() => setExpanded(open ? null : pillar.key)}
                      style={st.disclosure}
                      accessibilityRole="button"
                      accessibilityLabel={`How to improve ${pillar.label}`}
                      accessibilityState={{ expanded: open }}
                    >
                      <Text style={st.disclosureText}>How to improve</Text>
                      <ChevronDown
                        size={14}
                        color={colors.primaryAccent}
                        strokeWidth={2.6}
                        style={open ? st.chevronOpen : undefined}
                      />
                    </PressableScale>

                    {open && (
                      <Animated.Text entering={FadeIn} style={st.pillarTip}>
                        {pillar.tip}
                      </Animated.Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* Where it comes from */}
          {sources.length > 1 && (
            <Animated.View
              entering={FadeInDown.springify().delay(180)}
              style={[st.card, cardShadow]}
            >
              <Text style={st.cardTitle}>Where it comes from</Text>
              <View style={st.donutRow}>
                <Donut slices={sources} palette={SLICE_PALETTE} size={148}>
                  <Text style={st.donutTotal}>
                    {Money.format(totalIncomePaise, { zeroDecimals: true })}
                  </Text>
                  <Text style={st.donutCaption}>6 months</Text>
                </Donut>
                <View style={st.sourceList}>
                  {sources.slice(0, 5).map((source, i) => (
                    <View key={source.name} style={st.sourceRow}>
                      <View
                        style={[
                          st.sourceDot,
                          {
                            backgroundColor:
                              SLICE_PALETTE[i % SLICE_PALETTE.length],
                          },
                        ]}
                      />
                      <Text style={st.sourceName} numberOfLines={1}>
                        {source.name}
                      </Text>
                      <Text style={st.sourceShare}>
                        {Math.round(
                          (source.totalPaise / Math.max(1, totalIncomePaise)) *
                            100,
                        )}
                        %
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          <NextSalaryWidget />
          <IncomeInsightsWidget />

          {/* Actions */}
          <View>
            <Text style={st.sectionLabel}>NEXT STEPS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={st.actionBleed}
              contentContainerStyle={st.actionRail}
            >
              {[
                {
                  key: 'add',
                  icon: Plus,
                  label: 'Add income',
                  body: 'Log a payment you’ve received',
                  onPress: () => navigation.navigate('UserTabs', { screen: 'Add' }),
                },
                {
                  key: 'goal',
                  icon: Target,
                  label: 'Set a savings goal',
                  body: 'Turn a good month into progress',
                  onPress: () => navigation.navigate('Goals'),
                },
                {
                  key: 'report',
                  icon: Download,
                  label: 'Export a report',
                  body: 'Take the numbers with you',
                  onPress: () => navigation.navigate('Reports'),
                },
              ].map(action => (
                <PressableScale
                  key={action.key}
                  onPress={action.onPress}
                  style={[st.actionCard, cardShadow]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={st.actionIcon}>
                    <action.icon
                      size={16}
                      color={colors.primaryAccent}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text style={st.actionLabel}>{action.label}</Text>
                  <Text style={st.actionBody}>{action.body}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, cardRadius: number, chipRadius: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: chipRadius,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 26,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    stack: { gap: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 16,
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      marginBottom: 16,
    },

    scoreRow: { alignItems: 'center', paddingTop: 8 },
    verdict: {
      fontSize: 17,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 20,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: {
      fontSize: 11,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },

    pillarList: { gap: 24 },
    pillar: { gap: 8 },
    pillarHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pillarIcon: {
      width: 28,
      height: 28,
      borderRadius: chipRadius,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillarName: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    pillarScore: { fontSize: 15, fontFamily: 'Satoshi-Black' },
    pillarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceSunken,
      overflow: 'hidden',
    },
    pillarFill: { height: '100%', borderRadius: 3 },
    pillarMeaning: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },
    disclosure: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
    },
    disclosureText: {
      fontSize: 12,
      fontFamily: 'Satoshi-Bold',
      color: colors.primaryAccent,
    },
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    pillarTip: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'Satoshi-Regular',
      color: colors.textPrimary,
      backgroundColor: colors.surfaceSunken,
      borderRadius: 14,
      padding: 12,
    },

    donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    donutTotal: {
      fontSize: 17,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
    },
    donutCaption: {
      fontSize: 11,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
    sourceList: { flex: 1, gap: 10 },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sourceDot: { width: 8, height: 8, borderRadius: 4 },
    sourceName: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'Satoshi-Medium',
      color: colors.textPrimary,
    },
    sourceShare: {
      fontSize: 13,
      fontFamily: 'Satoshi-Bold',
      color: colors.textSecondary,
    },

    sectionLabel: {
      fontSize: 11,
      letterSpacing: 1,
      fontFamily: 'Satoshi-Bold',
      color: colors.sectionLabel,
      marginBottom: 12,
    },
    actionBleed: { marginHorizontal: -24 },
    actionRail: { paddingHorizontal: 24, gap: 12 },
    actionCard: {
      width: 172,
      padding: 16,
      borderRadius: cardRadius,
      backgroundColor: colors.card,
      gap: 6,
    },
    actionIcon: {
      width: 32,
      height: 32,
      borderRadius: chipRadius,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    actionLabel: {
      fontSize: 14,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    actionBody: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: 'Satoshi-Regular',
      color: colors.textSecondary,
    },
  });

export default IncomeDetailScreen;
