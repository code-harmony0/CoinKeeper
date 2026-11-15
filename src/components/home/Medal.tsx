import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { Flame, Lock, Medal as MedalIcon, PiggyBank, Target, Trophy, type LucideIcon } from 'lucide-react-native';
import { brand } from '../../theme/specTheme';
import type { Badge } from '../../services/badges';

const ICONS: Record<Badge['icon'], LucideIcon> = { Flame, Trophy, Medal: MedalIcon, PiggyBank, Target };

interface Props {
  icon: Badge['icon'];
  earned: boolean;
  size?: number;
  id: string;
  /** Surface the medal sits on, so locked medals stay legible in both themes. */
  dark?: boolean;
}

/**
 * A medal as an object: metallic rim, an inset disc, a gloss highlight and a
 * soft ground shadow. Locked medals keep the same silhouette in cold grey with
 * a small lock, so the shelf reads as a collection to fill.
 */
export const Medal: React.FC<Props> = ({ icon, earned, size = 60, id, dark }) => {
  const Icon = ICONS[icon];
  const r = size / 2;
  const rim = earned ? ['#FFE27A', '#FFB400', '#C98A00'] : dark ? ['#4B4F58', '#34373E', '#26282D'] : ['#E6E8EC', '#CED2D9', '#B7BCC5'];
  const disc = earned ? ['#FFD23F', '#FFC400'] : dark ? ['#30333A', '#272A30'] : ['#DDE0E5', '#D0D4DB'];
  return (
    <View style={{ width: size, height: size + 6 }}>
      <Svg width={size} height={size + 6}>
        <Defs>
          <LinearGradient id={`rim-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={rim[0]} />
            <Stop offset="0.5" stopColor={rim[1]} />
            <Stop offset="1" stopColor={rim[2]} />
          </LinearGradient>
          <LinearGradient id={`disc-${id}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={disc[0]} />
            <Stop offset="1" stopColor={disc[1]} />
          </LinearGradient>
          <RadialGradient id={`gloss-${id}`} cx="30%" cy="22%" r="60%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={earned ? 0.5 : 0.18} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {earned && <Ellipse cx={r} cy={size + 2} rx={r * 0.62} ry={3} fill={brand.signal} opacity={0.35} />}
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#rim-${id})`} />
        <Circle cx={r} cy={r} r={r * 0.78} fill={`url(#disc-${id})`} />
        <Circle cx={r} cy={r} r={r * 0.78} fill="none" stroke="#000" strokeOpacity={earned ? 0.14 : 0.1} strokeWidth={1} />
        <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#gloss-${id})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.glyph, { height: size }]}>
        <Icon
          size={earned ? size * 0.42 : size * 0.34}
          strokeWidth={1.6}
          color={earned ? brand.ink : dark ? 'rgba(255,255,255,0.45)' : '#6B7280'}
        />
      </View>
      {!earned && (
        <View style={[styles.lock, dark ? styles.lockDark : styles.lockLight]}>
          <Lock size={10} strokeWidth={2} color={dark ? '#FFFFFF' : '#FFFFFF'} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDark: { backgroundColor: '#4B4F58' },
  lockLight: { backgroundColor: '#6B7280' },
});
