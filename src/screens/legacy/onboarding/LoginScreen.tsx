import React, { useState } from 'react';
import { View, StyleSheet, Pressable, StatusBar, Keyboard, ScrollView, TextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading, BodyText, Caption } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  Shield,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<any, 'Login'>;

type UserRole = 'user' | 'admin';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string[];
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'user',
    title: 'User',
    description: 'Track expenses & join chit funds',
    icon: <User size={40} color={COLORS.navyText} strokeWidth={2} />,
    gradient: COLORS.gradientBlue,
    color: COLORS.babyBlue,
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage groups & members',
    icon: <Shield size={40} color={COLORS.navyText} strokeWidth={2} />,
    gradient: COLORS.gradientPeach,
    color: COLORS.softPeach,
  },
];

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [phoneNumber, setPhoneNumber] = useState('');
  const insets = useSafeAreaInsets();

  const handleRoleSelect = (role: UserRole) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setSelectedRole(role);
  };

  const handleContinue = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Keyboard.dismiss();

    // For demo: Navigate directly to the appropriate navigator
    if (selectedRole === 'user') {
      navigation.replace('UserTabNavigator');
    } else {
      // TODO: Navigate to AdminTabNavigator when created
      navigation.replace('UserTabNavigator'); // Temporary
    }
  };

  const handleDemoLogin = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.replace('UserTabNavigator');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Gradient */}
      <LinearGradient
        colors={COLORS.gradientMint}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Blobs */}
      <View style={styles.blobsContainer}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
              style={styles.logoCircle}
            >
              <Sparkles size={48} color={COLORS.navyText} fill={COLORS.mintGreen} strokeWidth={2} />
            </LinearGradient>
          </View>
          <Heading level={2} color="#FFFFFF" style={styles.title}>
            Welcome to CoinKeeper
          </Heading>
          <Caption color="rgba(255, 255, 255, 0.85)" align="center" style={styles.subtitle}>
            Choose your role to get started
          </Caption>
        </View>

        {/* Role Selection Cards */}
        <View style={styles.rolesContainer}>
          {ROLE_OPTIONS.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={selectedRole === role.id}
              onPress={() => handleRoleSelect(role.id)}
            />
          ))}
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            style={styles.inputCard}
          >
            <View style={styles.inputIconContainer}>
              <Phone size={20} color={COLORS.grayText} strokeWidth={2} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor="rgba(30, 42, 51, 0.4)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </LinearGradient>
        </View>

        {/* Continue Button */}
        <Button
          title="Continue"
          onPress={handleContinue}
          gradient={ROLE_OPTIONS.find((r) => r.id === selectedRole)?.gradient || COLORS.gradientBlue}
          icon={<ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />}
          iconPosition="right"
          style={styles.continueButton}
          disabled={phoneNumber.length < 10}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Caption color="rgba(255, 255, 255, 0.7)" medium style={styles.dividerText}>
            OR
          </Caption>
          <View style={styles.dividerLine} />
        </View>

        {/* Demo Login Button */}
        <Pressable onPress={handleDemoLogin} style={styles.demoButton}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.demoButtonGradient}
          >
            <Caption color="#FFFFFF" medium>
              Continue as Demo User
            </Caption>
          </LinearGradient>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Caption color="rgba(255, 255, 255, 0.7)" align="center" style={styles.footerText}>
            By continuing, you agree to our{'\n'}
            <Caption color="#FFFFFF" medium>
              Terms of Service
            </Caption>{' '}
            and{' '}
            <Caption color="#FFFFFF" medium>
              Privacy Policy
            </Caption>
          </Caption>
        </View>
      </ScrollView>
    </View>
  );
};

const RoleCard: React.FC<{
  role: RoleOption;
  isSelected: boolean;
  onPress: () => void;
}> = ({ role, isSelected, onPress }) => {
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 3 : 0);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1, {
      damping: 15,
      stiffness: 150,
    });
    borderWidth.value = withSpring(isSelected ? 3 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isSelected]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
  }));

  return (
    <Pressable onPress={onPress} style={styles.roleCardPressable}>
      <Animated.View style={[styles.roleCard, animatedContainerStyle, animatedBorderStyle]}>
        <LinearGradient
          colors={
            isSelected
              ? ['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']
              : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.75)']
          }
          style={styles.roleCardGradient}
        >
          {/* Icon Container */}
          <View style={[styles.roleIconContainer, { backgroundColor: `${role.color}30` }]}>
            {role.icon}
          </View>

          {/* Text Content */}
          <Heading level={4} color={COLORS.navyText} style={styles.roleTitle}>
            {role.title}
          </Heading>
          <Caption color={COLORS.grayText} align="center" style={styles.roleDescription}>
            {role.description}
          </Caption>

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.selectionBadge}>
              <View style={[styles.selectionDot, { backgroundColor: role.color }]} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.mintGreen,
  },
  blobsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blob1: {
    width: 250,
    height: 250,
    top: -80,
    right: -60,
  },
  blob2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  blob3: {
    width: 180,
    height: 180,
    top: '40%',
    right: -40,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  roleCardPressable: {
    flex: 1,
  },
  roleCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderColor: '#FFFFFF',
  },
  roleCardGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  roleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectionBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputIconContainer: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navyText,
    paddingVertical: SPACING.sm,
  },
  continueButton: {
    marginBottom: SPACING.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: SPACING.md,
  },
  demoButton: {
    marginBottom: SPACING.xl,
  },
  demoButtonGradient: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  footer: {
    marginTop: SPACING.md,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
