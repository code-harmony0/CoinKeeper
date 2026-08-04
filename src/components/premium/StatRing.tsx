import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useSpecTheme } from '../../theme/specTheme';

export type StatRingTint = 'lavender' | 'mint' | 'peach' | 'accent';

export interface StatRingProps {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  tint?: StatRingTint;
  label?: string;
  centerLabel?: string;
  centerValue?: React.ReactNode;
}

const DEFAULT_SIZE = 168;
const DEFAULT_STROKE = 17;

/**
 * Circular SVG progress ring per DESIGN.md section 7 (StatRing).
 * Track = colors.chipBg, fill = the chosen tint's `*Deep` color (or
 * primaryAccent for 'accent'). Matches the ring pattern already used in
 * KazaScreen (rotation -90, rounded linecap, strokeDasharray/-offset).
 */
export const StatRing: React.FC<StatRingProps> = ({
  value,
  total,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  tint = 'accent',
  label,
  centerLabel,
  centerValue,
}) => {
  const { colors } = useSpecTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;

  const fillColor =
    tint === 'lavender'
      ? colors.lavenderDeep
      : tint === 'mint'
      ? colors.mintDeep
      : tint === 'peach'
      ? colors.peachDeep
      : colors.primaryAccent;

  const path = Skia.Path.Make();
  path.addCircle(size / 2, size / 2, radius);

  const start = 270;
  const end = progress * 360;

  const progressPath = Skia.Path.Make();
  progressPath.addArc({ x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth }, start, end);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        <Path path={path} style="stroke" strokeWidth={strokeWidth} color={colors.chipBg} />
        <Path path={progressPath} style="stroke" strokeWidth={strokeWidth} color={fillColor} strokeCap="round" />
      </Canvas>
      <View style={styles.center}>
        {centerValue ? (
          <Text style={[styles.centerValue, { color: colors.textPrimary }]}>{centerValue}</Text>
        ) : (
          <Text style={[styles.centerValue, { color: colors.textPrimary }]}>
            {Math.round(value).toLocaleString('en-IN')}
          </Text>
        )}
        <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>
          {centerLabel ?? label ?? `of ${total}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 40,
    fontFamily: 'Satoshi-Black',
  },
  centerLabel: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    marginTop: 2,
  },
});

export default StatRing;
