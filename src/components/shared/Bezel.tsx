import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  /** `ink` sits on the black hero; `paper` sits on the light canvas. */
  tone: 'ink' | 'paper';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  coreStyle?: StyleProp<ViewStyle>;
  padding?: number;
  /** Opaque dark plate, for an `ink` block sitting on the light canvas. */
  solid?: boolean;
}

/**
 * The app's one nested container: a hairline outer shell around an inner plate
 * with a smaller, concentric radius and a 1px top highlight. Used wherever a
 * block earns emphasis (streak, badge shelf), so they all share one shape.
 */
export const Bezel: React.FC<Props> = ({ tone, children, style, coreStyle, padding = 16, solid }) => {
  const { colors, isDark } = useSpecTheme();
  const ink = tone === 'ink';
  const shell = ink
    ? solid
      ? { backgroundColor: '#18181B', borderColor: '#2B2B30' }
      : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }
    : { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.chipBg, borderColor: colors.border };
  const core = ink ? (solid ? '#232327' : 'rgba(255,255,255,0.07)') : colors.card;
  const sheen = ink || isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.9)';
  return (
    <View style={[styles.shell, shell, style]}>
      <View style={[styles.core, { backgroundColor: core, padding }, coreStyle]}>
        <View style={[styles.sheen, { backgroundColor: sheen }]} pointerEvents="none" />
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: { padding: 6, borderRadius: 32, borderWidth: 1 },
  core: { borderRadius: 26, overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
});
