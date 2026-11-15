/**
 * IncomeHealthCard — income health on the home screen, at summary depth.
 *
 * The score used to be three labelled numbers in a row, which asked the user
 * to hold "80 is good, 0 is bad, out of 100" in their head for three metrics
 * they'd never seen defined. The card now shows position rather than value:
 * a charge bar against its own scale, three arcs, and six months of shape.
 *
 * What it deliberately does not do is explain the pillars — that's the detail
 * screen's job, one tap away. The card's whole argument is "here's where you
 * stand and here's the one thing to fix".
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Activity,
  ChevronRight,
  Layers,
  Lightbulb,
  TrendingUp,
} from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { ArcGauge, HealthBar, ScoreText, Sparkline } from './incomeVisuals';
import { NOT_ENOUGH_DATA } from '../../services/income/IncomeAnalyticsService';
import { verdictFor } from '../../services/income/incomeHealthCopy';
import type { IncomeHealth } from '../../hooks/useIncomeHealth';

const PILLAR_ICONS = { Activity, Layers, TrendingUp };

interface Props {
  health: IncomeHealth;
  onOpenDetail: () => void;
  /** Card width minus its padding, for the sparkline. */
  contentWidth: number;
}

export const IncomeHealthCard: React.FC<Props> = ({
  health,
  onOpenDetail,
  contentWidth,
}) => {
  const { colors, cardRadius, cardShadow, chipRadius } = useSpecTheme();
  const st = makeStyles(colors, cardRadius, chipRadius);

  // Nothing to show until there is a cached score — an empty health card is
  // worse than no card, because it implies the app knows something it doesn't.
  if (!health.loaded || health.empty) return null;

  const { score, pillars, weakest, months } = health;
  const hasTrend = months.some(m => m.totalPaise > 0);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <PressableScale
        onPress={onOpenDetail}
        style={[st.card, cardShadow]}
        accessibilityRole="button"
        accessibilityLabel={`Income health ${
          score === NOT_ENOUGH_DATA ? 'not yet scored' : `${score} out of 100`
        }. ${verdictFor(score)} Open details`}
      >
        <View style={st.header}>
          <View style={st.headerLeft}>
            <View style={st.iconBox}>
              <Activity size={16} color={colors.skyDeep} strokeWidth={2.4} />
            </View>
            <Text style={st.title}>Income Health</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.2} />
        </View>

        <View style={st.scoreBlock}>
          <ScoreText score={score} colors={colors} size={48} />
          <Text style={st.verdict}>{verdictFor(score)}</Text>
        </View>

        <HealthBar score={score} colors={colors} />

        <View style={st.pillars}>
          {pillars.map((pillar, i) => {
            const Icon = PILLAR_ICONS[pillar.icon];
            return (
              <View key={pillar.key} style={st.pillar}>
                <ArcGauge
                  score={pillar.score}
                  colors={colors}
                  size={64}
                  delay={300 + i * 90}
                />
                <View style={st.pillarLabelRow}>
                  <Icon size={11} color={colors.textSecondary} strokeWidth={2.4} />
                  <Text style={st.pillarLabel}>{pillar.label}</Text>
                </View>
                <Text style={st.pillarScore}>
                  {pillar.score === NOT_ENOUGH_DATA ? 'Not yet' : pillar.score}
                </Text>
              </View>
            );
          })}
        </View>

        {hasTrend && (
          <View style={st.trend}>
            <Text style={st.trendLabel}>Last 6 months</Text>
            <Sparkline months={months} colors={colors} width={contentWidth} />
          </View>
        )}

        {weakest && (
          <View style={st.action}>
            <Lightbulb size={14} color={colors.peachDeep} strokeWidth={2.4} />
            <View style={st.actionText}>
              <Text style={st.actionTitle}>
                {weakest.label} is your weakest area
              </Text>
              <Text style={st.actionBody}>{weakest.tip}</Text>
            </View>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
};

const makeStyles = (colors: any, cardRadius: number, chipRadius: number) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: cardRadius,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: chipRadius,
      backgroundColor: colors.sky,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    scoreBlock: { marginBottom: 12 },
    verdict: {
      fontSize: 14,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
      marginTop: 2,
    },
    // Three gauges crammed edge to edge read as one broken widget rather than
    // three measurements. They need the gap and the vertical room to separate.
    pillars: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      paddingHorizontal: 4,
    },
    pillar: { flex: 1, alignItems: 'center', gap: 8 },
    pillarLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pillarLabel: {
      fontSize: 12,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
    pillarScore: {
      fontSize: 16,
      fontFamily: 'Satoshi-Bold',
      color: colors.textPrimary,
    },
    trend: { marginTop: 20, gap: 6 },
    trendLabel: {
      fontSize: 12,
      letterSpacing: 0.8,
      fontFamily: 'Satoshi-Bold',
      color: colors.sectionLabel,
    },
    action: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceSunken,
    },
    actionText: { flex: 1, gap: 3 },
    actionTitle: {
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

export default IncomeHealthCard;
