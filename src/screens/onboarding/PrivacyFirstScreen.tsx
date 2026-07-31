import React from 'react';
import { View, StyleSheet, ScrollView, Text as RNText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Lock, CloudOff, EyeOff, Smartphone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Button } from '../../components/ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { spacing } from '../../theme/designTokens';

interface PrivacyFirstScreenProps {
  onAccept: () => void;
}

export const PrivacyFirstScreen: React.FC<PrivacyFirstScreenProps> = ({ onAccept }) => {
  const insets = useSafeAreaInsets();
  const { colors, iconShadow, space } = useSpecTheme();

  const privacyPoints = [
    {
      icon: <Smartphone size={24} color={colors.primaryAccent} />,
      title: '100% Local Processing',
      description: 'Your SMS and financial data never leave your phone. All AI processing happens right here.',
    },
    {
      icon: <Lock size={24} color={colors.primaryAccent} />,
      title: 'No Bank Logins',
      description: 'We don’t ask for your bank passwords or net banking details. Ever.',
    },
    {
      icon: <CloudOff size={24} color={colors.primaryAccent} />,
      title: 'No Cloud Storage',
      description: 'Your personal expenses are stored in a secure local database, not on our servers.',
    },
    {
      icon: <EyeOff size={24} color={colors.primaryAccent} />,
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
          <View style={[styles.iconContainer, { backgroundColor: colors.chipBg }, iconShadow]}>
            <Shield size={48} color={colors.primaryAccent} strokeWidth={1.5} />
          </View>
          <RNText style={[styles.title, { color: colors.textPrimary }]}>Privacy First</RNText>
          <RNText style={[styles.subtitle, { color: colors.textSecondary }]}>
            We built CoinKeeper because we believe your financial data should belong to you, and only you.
          </RNText>
        </Animated.View>

        <View style={styles.pointsContainer}>
          {privacyPoints.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.springify().delay(200 + index * 100)}
              style={styles.pointRow}
            >
              <View style={[styles.pointIcon, { backgroundColor: colors.chipBg }, iconShadow]}>
                {point.icon}
              </View>
              <View style={styles.pointText}>
                <RNText style={[styles.pointTitle, { color: colors.textPrimary }]}>{point.title}</RNText>
                <RNText style={[styles.pointDescription, { color: colors.textSecondary }]}>
                  {point.description}
                </RNText>
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
            paddingBottom: Math.max(insets.bottom, space.md),
            backgroundColor: colors.background,
          }
        ]}
      >
        <Button
          title="I Understand & Agree"
          onPress={onAccept}
          style={[styles.button, { backgroundColor: colors.primaryAccent }]}
          textStyle={{ color: '#FFFFFF' }}
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
    padding: spacing.m, // 24
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl, // 48
    marginTop: spacing.l, // 32
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m, // 24
  },
  title: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
    letterSpacing: -0.3,
    marginBottom: spacing.xs, // 8
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
    textAlign: 'center',
    paddingHorizontal: spacing.s, // 16
    lineHeight: 22,
  },
  pointsContainer: {
    gap: spacing.l, // 32
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s, // 16
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
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
    marginBottom: 4,
  },
  pointDescription: {
    fontSize: 14,
    fontFamily: 'Satoshi-Medium',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
  },
  button: {
    width: '100%',
    height: 56,
  },
});

export default PrivacyFirstScreen;
