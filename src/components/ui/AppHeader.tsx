import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from './Text';
import { PressableScale } from '../anim/PressableScale';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  title: string;
  /**
   * Omit on a root tab screen. A back arrow is a promise that there is
   * somewhere to go back to; on a tab root there isn't, and pressing it either
   * does nothing or drops the user out of the tab they chose.
   */
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

/**
 * Single source of truth for screen headers — back button, title, and an
 * optional right-side actions slot. Mirrors TransactionsScreen's original
 * header exactly so every screen shares one back-button/title language.
 */
export const AppHeader: React.FC<Props> = ({ title, onBack, rightActions }) => {
  const { colors } = useSpecTheme();

  return (
    <View style={styles.headerRow}>
      {onBack ? (
        <PressableScale
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backButton, { backgroundColor: colors.chipBg }]}
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {rightActions ? <View style={styles.rightActions}>{rightActions}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: -4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default AppHeader;
