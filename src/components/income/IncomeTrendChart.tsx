/**
 * IncomeTrendChart — six months of income, tappable.
 *
 * The average is drawn as a dotted rule and the extremes are ringed, because
 * the useful question about an irregular income isn't "what did June do" but
 * "how far apart are my best and worst months" — the shape has to answer that
 * before anything is tapped.
 *
 * Tapping a month pins its exact figure. There is no pinch-to-zoom: six points
 * across the full card width are already at their most readable, and a gesture
 * that can only make them worse isn't an affordance.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from 'react-native-svg';
import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';
import type { IncomeMonth } from '../../services/income/IncomeAnalyticsService';

const HEIGHT = 132;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

interface Props {
  months: IncomeMonth[];
  width: number;
}

export const IncomeTrendChart: React.FC<Props> = ({ months, width }) => {
  const { colors } = useSpecTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const st = makeStyles(colors);

  if (months.length < 2) return null;

  const values = months.map(m => m.totalPaise);
  const max = Math.max(...values, 1);
  const average = values.reduce((s, v) => s + v, 0) / values.length;

  const maxIndex = values.indexOf(Math.max(...values));
  const minIndex = values.indexOf(Math.min(...values));

  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const step = width / (months.length - 1);
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;

  const points = months.map((m, i) => ({ x: i * step, y: y(m.totalPaise) }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M0,${PAD_TOP + plotH} L${points
    .map(p => `${p.x},${p.y}`)
    .join(' L')} L${width},${PAD_TOP + plotH} Z`;

  const active = selected !== null ? months[selected] : null;

  return (
    <View>
      <View style={st.readout}>
        <Text style={st.readoutValue}>
          {Money.format(
            active ? active.totalPaise : Math.round(average),
            { zeroDecimals: true },
          )}
        </Text>
        <Text style={st.readoutLabel}>
          {active ? active.label : 'monthly average'}
        </Text>
      </View>

      <View style={{ width, height: HEIGHT }}>
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primaryAccent} stopOpacity="0.16" />
              <Stop offset="1" stopColor={colors.primaryAccent} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          <Path d={area} fill="url(#trendFill)" />

          {/* Average — a dotted rule, so a month reads as above or below it
              without needing a y-axis. */}
          <Line
            x1={0}
            y1={y(average)}
            x2={width}
            y2={y(average)}
            stroke={colors.textSecondary}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />

          <Polyline
            points={polyline}
            fill="none"
            stroke={colors.primaryAccent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => {
            const extreme = i === maxIndex || i === minIndex;
            const isActive = selected === i;
            return (
              <Circle
                key={months[i].key}
                cx={p.x}
                cy={p.y}
                r={isActive ? 6 : extreme ? 5 : 3.5}
                fill={
                  i === maxIndex
                    ? colors.success
                    : i === minIndex
                      ? colors.warning
                      : colors.primaryAccent
                }
                stroke={colors.card}
                strokeWidth={isActive || extreme ? 2.5 : 0}
              />
            );
          })}
        </Svg>

        {/* Touch targets are RN views over the SVG: a 44dp column per month
            beats trying to hit a 4px circle. */}
        <View style={st.touchRow} pointerEvents="box-none">
          {months.map((month, i) => (
            <Pressable
              key={month.key}
              onPress={() => setSelected(selected === i ? null : i)}
              style={st.touchCol}
              accessibilityRole="button"
              accessibilityLabel={`${month.label}: ${Money.format(
                month.totalPaise,
                { zeroDecimals: true },
              )}`}
            >
              <Text
                style={[
                  st.axisLabel,
                  selected === i && { color: colors.textPrimary },
                ]}
              >
                {month.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    readout: { marginBottom: 8 },
    readoutValue: {
      fontSize: 24,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    readoutLabel: {
      fontSize: 12,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
      marginTop: 1,
    },
    touchRow: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
    },
    touchCol: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 2,
    },
    axisLabel: {
      fontSize: 11,
      fontFamily: 'Satoshi-Medium',
      color: colors.textSecondary,
    },
  });

export default IncomeTrendChart;
