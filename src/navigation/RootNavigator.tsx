import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

// Screens
import { SplashScreen, OnboardingScreen, PrivacyFirstScreen } from '../screens/onboarding';
import { LoginScreen } from '../screens/auth';
import { GroupsScreen, AskAiScreen } from '../screens/user';
import { UserTabNavigator } from './UserTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { MembersStackNavigator } from './MembersStackNavigator';
import { TransactionsStackNavigator } from './TransactionsStackNavigator';
import { CollectionsStackNavigator } from './CollectionsStackNavigator';
import { DrawsStackNavigator } from './DrawsStackNavigator';
import { PaymentConfirmationsStackNavigator } from './PaymentConfirmationsStackNavigator';
import { NotificationsStackNavigator } from './NotificationsStackNavigator';
import { AnalyticsStackNavigator } from './AnalyticsStackNavigator';
import { AuditLogScreen } from '../screens/admin/settings/AuditLogScreen';
import { PermissionsRolesScreen } from '../screens/admin/settings/PermissionsRolesScreen';
import { ChitDetailScreen } from '../screens/user/ChitDetailScreen';
import { ReportsScreen } from '../screens/user/ReportsScreen';

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
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="UserTabs" component={UserTabNavigator} />
        <Stack.Screen name="Groups" component={GroupsScreen} />
        <Stack.Screen name="ChitDetail" component={ChitDetailScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="AskAi" component={AskAiScreen} />
        <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
        <Stack.Screen name="MembersStack" component={MembersStackNavigator} />
        <Stack.Screen name="TransactionsStack" component={TransactionsStackNavigator} />
        <Stack.Screen name="Collections" component={CollectionsStackNavigator} />
        <Stack.Screen name="Draws" component={DrawsStackNavigator} />
        <Stack.Screen name="PaymentConfirmations" component={PaymentConfirmationsStackNavigator} />
        <Stack.Screen name="Notifications" component={NotificationsStackNavigator} />
        <Stack.Screen name="Analytics" component={AnalyticsStackNavigator} />
        <Stack.Screen name="AuditLog" component={AuditLogScreen} />
        <Stack.Screen name="PermissionsRoles" component={PermissionsRolesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
