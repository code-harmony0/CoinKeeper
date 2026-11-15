import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  title: string;
  /** Makes the heading a link, "December ›" style. */
  onPress?: () => void;
  children: React.ReactNode;
}

/**
 * A flat, labelled section on the canvas: a hairline, a heading that doubles
 * as the way into the full list, then content. No card around it, so the
 * screen reads as one calm column instead of a stack of boxes.
 */
export const HomeSection: React.FC<Props> = ({ title, onPress, children }) => {
  const { colors } = useSpecTheme();
  const head = (
    <View style={styles.head}>
      <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
      {onPress && <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2.2} />}
    </View>
  );
  return (
    <View style={[styles.root, { borderTopColor: colors.border }]}>
      {onPress ? (
        <PressableScale
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${title}, view all`}
          style={styles.headPress}
        >
          {head}
        </PressableScale>
      ) : (
        head
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  headPress: { alignSelf: 'flex-start' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
  },
  title: { fontSize: 20, lineHeight: 28, fontFamily: 'Satoshi-Bold' },
});
