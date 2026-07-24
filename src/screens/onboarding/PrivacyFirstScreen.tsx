import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Lock, CloudOff, EyeOff, Smartphone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/designTokens';

interface PrivacyFirstScreenProps {
  onAccept: () => void;
}

export const PrivacyFirstScreen: React.FC<PrivacyFirstScreenProps> = ({ onAccept }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const privacyPoints = [
    {
      icon: <Smartphone size={24} color={colors.primary} />,
      title: '100% Local Processing',
      description: 'Your SMS and financial data never leave your phone. All AI processing happens right here.',
    },
    {
      icon: <Lock size={24} color={colors.primary} />,
      title: 'No Bank Logins',
      description: 'We don’t ask for your bank passwords or net banking details. Ever.',
    },
    {
      icon: <CloudOff size={24} color={colors.primary} />,
      title: 'No Cloud Storage',
      description: 'Your personal expenses are stored in a secure local database, not on our servers.',
    },
    {
      icon: <EyeOff size={24} color={colors.primary} />,
      title: 'No Ads or Tracking',
      description: 'We do not sell your financial data to third parties. Your money is your business.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify().delay(100)} style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <Shield size={48} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text variant="h1" style={styles.title}>Privacy First</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            We built CoinKeeper because we believe your financial data should belong to you, and only you.
          </Text>
        </Animated.View>

        <View style={styles.pointsContainer}>
          {privacyPoints.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.springify().delay(200 + index * 100)}
              style={styles.pointRow}
            >
              <View style={[styles.pointIcon, { backgroundColor: colors.surfaceSecondary }]}>
                {point.icon}
              </View>
              <View style={styles.pointText}>
                <Text variant="h2" style={styles.pointTitle}>{point.title}</Text>
                <Text variant="caption" color="secondary" style={styles.pointDescription}>
                  {point.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeIn.delay(800)}
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.m),
            backgroundColor: colors.background,
          }
        ]}
      >
        <Button
          title="I Understand & Agree"
          onPress={onAccept}
          variant="primary"
          size="large"
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.m,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.l,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.s,
    lineHeight: 22,
  },
  pointsContainer: {
    gap: spacing.l,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  pointIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointText: {
    flex: 1,
  },
  pointTitle: {
    marginBottom: 4,
  },
  pointDescription: {
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  button: {
    width: '100%',
  },
});

export default PrivacyFirstScreen;
