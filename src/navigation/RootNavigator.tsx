import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import {
  SplashScreen,
  OnboardingScreen,
  PrivacyFirstScreen,
  FirstRunSetupScreen,
} from '../screens/onboarding';
import { AskAiScreen } from '../screens/user';
import { UserTabNavigator } from './UserTabNavigator';
import { ReportsScreen } from '../screens/user/ReportsScreen';
import { IncomeDetailScreen } from '../screens/user/IncomeDetailScreen';
import { CategoriesScreen } from '../screens/user/CategoriesScreen';
import { BudgetScreen } from '../screens/user/BudgetScreen';
import { BillsScreen } from '../screens/user/BillsScreen';
import { GoalsScreen } from '../screens/user/GoalsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SmsReviewScreen } from '../screens/user/SmsReviewScreen';
import { BackupRestoreScreen } from '../screens/user/BackupRestoreScreen';
import { SmartParsingScreen } from '../screens/user/SmartParsingScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';
import { SetupPinScreen } from '../screens/auth/SetupPinScreen';
import { useAppLock } from '../context/AppLockContext';
import { APP_LOCK_ENABLED } from '../config/buildFlags';
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
  const [showSetup, setShowSetup] = useState(false);
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
    setShowSetup(false);
    setShowPinSetup(false);
    setShowBiometricEnroll(false);
  };

  // Privacy acceptance hands off to the setup flow, which is where the user
  // declares their income and gets a first goal — the app's numbers are all
  // empty states until then.
  const handlePrivacyAccept = () => {
    setShowPrivacyScreen(false);
    setShowSetup(true);
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    // In development the PIN step is skipped outright rather than shown and
    // dismissed — onboarding should reach the app, not a lock the developer
    // then has to remember.
    if (APP_LOCK_ENABLED) {
      setShowPinSetup(true);
    } else {
      finishFirstRun();
    }
  };

  const handlePinSetupComplete = async () => {
    setShowPinSetup(false);
    // Same gate as the PIN. Enrolling biometrics is part of the lock feature,
    // and a fingerprint prompt on every dev launch is the same friction the
    // PIN screen was removed for.
    if (APP_LOCK_ENABLED && (await isBiometricAvailable())) {
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
  //
  // APP_LOCK_ENABLED is false in development so a reload doesn't cost a PIN
  // entry; it is hardcoded true in release by `__DEV__`. See buildFlags.ts.
  if (APP_LOCK_ENABLED && isLocked && pinIsSet) {
    return <UnlockScreen onUnlock={unlock} />;
  }

  return (
    <NavigationContainer navigationInChildEnabled>
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
          ) : showSetup ? (
            <Stack.Screen name="FirstRunSetup">
              {() => <FirstRunSetupScreen onComplete={handleSetupComplete} />}
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
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="Budget" component={BudgetScreen} />
        <Stack.Screen name="Bills" component={BillsScreen} />
        <Stack.Screen name="Goals" component={GoalsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
        <Stack.Screen name="SmartParsing" component={SmartParsingScreen} />
        <Stack.Screen name="SmsReview" component={SmsReviewScreen} />
        <Stack.Screen name="AskAi" component={AskAiScreen} />
        <Stack.Screen name="IncomeDetail" component={IncomeDetailScreen} />
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
