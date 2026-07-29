import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

// Screens
import { SplashScreen, OnboardingScreen, PrivacyFirstScreen } from '../screens/onboarding';
import { AskAiScreen } from '../screens/user';
import { UserTabNavigator } from './UserTabNavigator';
import { ReportsScreen } from '../screens/user/ReportsScreen';
import { CHITFUND_ENABLED } from '../config/buildFlags';

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

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenOnboarding(seen === 'true');
    } catch {
      setHasSeenOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowPrivacyScreen(true);
  };

  const handlePrivacyAccept = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
    setShowPrivacyScreen(false);
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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!hasSeenOnboarding && (
          showPrivacyScreen ? (
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
