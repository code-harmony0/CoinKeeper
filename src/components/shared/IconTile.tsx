import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { brand, useSpecTheme } from '../../theme/specTheme';

/** The black rounded square every list row leads with (bills, chits, income). */
export const IconTile: React.FC<{ icon: LucideIcon; size?: number }> = ({ icon: Icon, size = 48 }) => {
  const { colors, isDark } = useSpecTheme();
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: isDark ? colors.chipBg : brand.ink },
      ]}
    >
      <Icon size={20} strokeWidth={1.7} color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  tile: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
