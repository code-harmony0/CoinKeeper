import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  size?: number;
}

/**
 * ChartIllustration
 * A simple, flat card containing ascending bars and a rising trend line,
 * built entirely from theme colors so it adapts to dark mode.
 */
export const ChartIllustration: React.FC<Props> = ({ size = 120 }) => {
  const { colors } = useSpecTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Card outline */}
      <Rect
        x="14"
        y="14"
        width="92"
        height="92"
        rx="16"
        fill={colors.card}
        stroke={colors.border}
        strokeWidth={3}
      />

      {/* Ascending bars */}
      <Rect x="30" y="76" width="12" height="18" rx="4" fill={colors.chipBg} />
      <Rect x="49" y="64" width="12" height="30" rx="4" fill={colors.chipBg} />
      <Rect x="68" y="48" width="12" height="46" rx="4" fill={colors.chipBg} />
      <Rect x="87" y="34" width="12" height="60" rx="4" fill={colors.primaryAccent} />

      {/* Rising trend line */}
      <Path
        d="M32 80 L51 66 L70 52 L93 30"
        stroke={colors.success}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Peak dot */}
      <Circle cx="93" cy="30" r="4.5" fill={colors.success} />
    </Svg>
  );
};

export default ChartIllustration;
