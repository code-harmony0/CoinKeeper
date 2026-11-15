import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Deterministic pseudo-random so the grain never shifts between renders.
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/**
 * Fine film grain and a soft top sheen over the black hero, so it reads as a
 * material instead of a flat fill. Static, decorative, never intercepts touches.
 */
export const HeroTexture: React.FC = () => {
  const dots = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 240 }, () => ({
      x: r() * 100,
      y: r() * 100,
      o: 0.05 + r() * 0.09,
      s: 0.5 + r() * 0.6,
    }));
  }, []);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.09} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="22%" fill="url(#sheen)" />
      {dots.map((d, i) => (
        <Circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.s} fill="#FFFFFF" opacity={d.o} />
      ))}
    </Svg>
  );
};
