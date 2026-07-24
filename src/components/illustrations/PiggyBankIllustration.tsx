import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  size?: number;
}

/**
 * PiggyBankIllustration
 * A simple, flat, friendly piggy bank with a coin dropping into the slot.
 * Colors are sourced entirely from the theme so it adapts to dark mode.
 */
export const PiggyBankIllustration: React.FC<Props> = ({ size = 120 }) => {
  const { colors } = useSpecTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Tail */}
      <Path
        d="M88 52 Q98 48 96 40 Q94 46 88 46"
        stroke={colors.border}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />

      {/* Legs */}
      <Rect x="38" y="86" width="8" height="14" rx="4" fill={colors.chipBg} stroke={colors.border} strokeWidth={2} />
      <Rect x="74" y="86" width="8" height="14" rx="4" fill={colors.chipBg} stroke={colors.border} strokeWidth={2} />

      {/* Ear */}
      <Path
        d="M42 38 Q38 26 50 30 Q48 36 42 38 Z"
        fill={colors.chipBg}
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Body */}
      <Ellipse
        cx="60"
        cy="62"
        rx="36"
        ry="28"
        fill={colors.chipBg}
        stroke={colors.border}
        strokeWidth={3}
      />

      {/* Coin slot */}
      <Rect x="52" y="34" width="16" height="4" rx="2" fill={colors.textSecondary} />

      {/* Coin dropping into slot */}
      <Circle cx="60" cy="20" r="9" fill={colors.primaryAccent} />
      <Path
        d="M60 15 v10 M57 17.5 h6 M57 22.5 h6"
        stroke={colors.card}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Snout */}
      <Ellipse cx="88" cy="62" rx="9" ry="7" fill={colors.card} stroke={colors.border} strokeWidth={2} />
      <Circle cx="85" cy="62" r="1.6" fill={colors.textSecondary} />
      <Circle cx="91" cy="62" r="1.6" fill={colors.textSecondary} />

      {/* Eye */}
      <Circle cx="70" cy="52" r="2.2" fill={colors.textPrimary} />

      {/* Smile */}
      <Path
        d="M74 62 Q78 66 82 62"
        stroke={colors.textSecondary}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

export default PiggyBankIllustration;
