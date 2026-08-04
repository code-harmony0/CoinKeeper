import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { Flame } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface StreakBannerProps {
  days: number;
  message: string;
}

export const StreakBanner: React.FC<StreakBannerProps> = ({ days, message }) => {
  const { colors, cardRadius, space } = useSpecTheme();

  if (days <= 0) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.container, { backgroundColor: colors.peach, borderRadius: cardRadius, padding: space.sm, gap: space.sm }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
        <Flame size={20} color={colors.peachDeep} strokeWidth={2.5} />
      </View>
      <View style={styles.textContainer}>
        <Text variant="body" style={styles.title}>{days} Day Streak!</Text>
        <Text variant="caption" color="secondary">{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
});
