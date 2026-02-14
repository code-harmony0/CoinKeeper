import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SPACING } from '../../theme';
import { BackgroundBlobs } from './BackgroundBlobs';

interface SafeContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  showBlobs?: boolean;
  useGradient?: boolean;
}

export const SafeContainer: React.FC<SafeContainerProps> = ({
  children,
  style,
  scrollable = true,
  showBlobs = false, // Disabled by default for cleaner banking UI
  useGradient = true,
}) => {
  const content = (
    <View style={styles.content}>
      {showBlobs && <BackgroundBlobs />}
      <View style={styles.innerContent}>{children}</View>
    </View>
  );

  const containerContent = scrollable ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      {useGradient ? (
        <LinearGradient
          colors={[COLORS.backgroundGradientStart, COLORS.backgroundGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {containerContent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 24, // Banking theme: 24px horizontal padding
    paddingVertical: SPACING.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
