import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

export type PastelCardTint = 'lavender' | 'mint' | 'peach';

export interface PastelCardProps {
  tint: PastelCardTint;
  eyebrow: string;
  value: React.ReactNode;
  caption?: string;
  progress?: number;
  onPress?: () => void;
  children?: React.ReactNode;
}

/**
 * Bucket card per DESIGN.md section 7. Flat pastel surface — no shadow,
 * hero value stays near-black (textPrimary), eyebrow/progress use the
 * tint's own `*Deep` color.
 */
export const PastelCard: React.FC<PastelCardProps> = ({
  tint,
  eyebrow,
  value,
  caption,
  progress,
  onPress,
  children,
}) => {
  const { colors, cardRadius } = useSpecTheme();

  const surface = colors[tint];
  const deep = colors[`${tint}Deep` as 'lavenderDeep' | 'mintDeep' | 'peachDeep'];

  const content = (
    <View
      style={[
        styles.card,
        children ? styles.cardWithOverlap : null,
        { backgroundColor: surface, borderRadius: cardRadius },
      ]}
    >
      <Text style={[styles.eyebrow, { color: deep }]}>{eyebrow.toUpperCase()}</Text>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      {caption ? <Text style={[styles.caption, { color: colors.textSecondary }]}>{caption}</Text> : null}
      {typeof progress === 'number' ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: deep },
            ]}
          />
        </View>
      ) : null}
      {children ? <View style={styles.overlapPill}>{children}</View> : null}
    </View>
  );

  if (onPress) {
    return <PressableScale onPress={onPress}>{content}</PressableScale>;
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
  },
  // Extra top clearance so the absolutely-positioned overlap pill (see
  // `overlapPill` below, DESIGN.md §7 "Depth through overlap") has clear
  // space above the eyebrow instead of colliding with it.
  cardWithOverlap: {
    paddingTop: 40,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'Satoshi-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    marginTop: 8,
  },
  caption: {
    fontSize: 14,
    fontFamily: 'Satoshi-Regular',
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  // The system's one sanctioned overlap motif (DESIGN.md §7): a small pill
  // pinned to the card's top-right corner, half on/half off the edge. Own
  // shadow so it stays legible over both the card's pastel tint and
  // whatever sits behind the card.
  overlapPill: {
    position: 'absolute',
    top: -10,
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default PastelCard;
