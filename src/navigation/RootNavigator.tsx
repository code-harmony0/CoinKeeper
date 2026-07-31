import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { SplashScreen, OnboardingScreen, PrivacyFirstScreen } from '../screens/onboarding';
import { AskAiScreen } from '../screens/user';
import { UserTabNavigator } from './UserTabNavigator';
import { ReportsScreen } from '../screens/user/ReportsScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';
import { SetupPinScreen } from '../screens/auth/SetupPinScreen';
import { useAppLock } from '../context/AppLockContext';
import { hasPinSet } from '../services/pinService';
import { isBiometricAvailable, promptBiometric } from '../services/biometricService';
import { setPreference } from '../store/database';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';

// A single optional, skippable step after PIN setup — reuses promptBiometric
// directly rather than a whole new screen file (Task 2.5). Only ever shown
// when isBiometricAvailable() is true; otherwise this branch is skipped
// entirely and onboarding finishes straight after PIN setup.
const BiometricEnrollScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const success = await promptBiometric('Enable biometric unlock for CoinKeeper');
      if (success) {
        await setPreference('biometric_enabled', 'true');
      }
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <View style={[bioStyles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={bioStyles.content}>
        <Text variant="h1" style={bioStyles.title}>Enable Face ID / Fingerprint?</Text>
        <Text variant="body" color="secondary" style={bioStyles.subtitle}>
          Unlock CoinKeeper faster with your device's biometrics, in addition to your PIN.
        </Text>
        <Button title="Enable" onPress={handleEnable} disabled={busy} loading={busy} style={bioStyles.button} />
        <Button title="Skip" variant="ghost" onPress={onDone} disabled={busy} />
      </View>
    </View>
  );
};

const bioStyles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 32 },
  button: { marginBottom: 12 },
});

// Every chit-fund route resolves through one guarded require. CHITFUND_ENABLED
// is inlined as a literal at build time, so Metro drops this branch and the
// entire src/modules/chitfund tree from the lite bundle.
const chitFundRoutes = process.env.CK_CHITFUND === '1'
  ? require('../modules/chitfund/navigation/chitFundRoutes').chitFundRoutes
  : [];

const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = '@hasSeenOnboarding';

export const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);
  const [pinIsSet, setPinIsSet] = useState(false);
  const { isLocked, unlock } = useAppLock();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenOnboarding(seen === 'true');
      // A user who hasn't completed onboarding's PIN setup yet shouldn't be
      // locked out before they've ever created a PIN — see Task 2.5.
      setPinIsSet(await hasPinSet());
    } catch {
      setHasSeenOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowPrivacyScreen(true);
  };

  const finishFirstRun = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
    setPinIsSet(true);
    setShowPrivacyScreen(false);
    setShowPinSetup(false);
    setShowBiometricEnroll(false);
  };

  // Privacy acceptance no longer marks onboarding complete directly — it
  // transitions into PIN setup first (Task 2.5).
  const handlePrivacyAccept = () => {
    setShowPrivacyScreen(false);
    setShowPinSetup(true);
  };

  const handlePinSetupComplete = async () => {
    setShowPinSetup(false);
    if (await isBiometricAvailable()) {
      setShowBiometricEnroll(true);
    } else {
      await finishFirstRun();
    }
  };

  // Splash screen
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#5B8DEF" />
      </View>
    );
  }

  // App lock gate. A user who hasn't set a PIN yet (still mid-onboarding,
  // Task 2.5) is never blocked here — only someone who has already
  // completed PIN setup sees the unlock screen.
  if (isLocked && pinIsSet) {
    return <UnlockScreen onUnlock={unlock} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!hasSeenOnboarding && (
          showBiometricEnroll ? (
            <Stack.Screen name="BiometricEnroll">
              {() => <BiometricEnrollScreen onDone={finishFirstRun} />}
            </Stack.Screen>
          ) : showPinSetup ? (
            <Stack.Screen name="SetupPin">
              {() => <SetupPinScreen onComplete={handlePinSetupComplete} />}
            </Stack.Screen>
          ) : showPrivacyScreen ? (
            <Stack.Screen name="PrivacyFirst">
              {() => <PrivacyFirstScreen onAccept={handlePrivacyAccept} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
            </Stack.Screen>
          )
        )}
        <Stack.Screen name="UserTabs" component={UserTabNavigator} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="AskAi" component={AskAiScreen} />
        {/* Login, admin console, and Notifications are all chit-fund routes —
            the lite build has no accounts and no server to log into. */}
        {chitFundRoutes.map((route: { name: string; component: React.ComponentType<any> }) => (
          <Stack.Screen key={route.name} name={route.name} component={route.component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
