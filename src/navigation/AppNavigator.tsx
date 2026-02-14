import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import WalkthroughScreen from '../screens/auth/WalkthroughScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PermissionScreen from '../screens/auth/PermissionScreen';

// Main Navigators
import { UserTabNavigator } from './UserTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';

export type AppStackParamList = {
  Splash: undefined;
  Walkthrough: undefined;
  Login: undefined;
  Register: undefined;
  Permission: undefined;
  UserDashboard: undefined;
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* Splash Screen */}
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ animation: 'none' }}
      />

      {/* Onboarding Flow */}
      <Stack.Screen
        name="Walkthrough"
        component={WalkthroughScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={PhoneLoginScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Permission"
        component={PermissionScreen}
        options={{ animation: 'slide_from_bottom' }}
      />

      {/* Main App - User Mode */}
      <Stack.Screen
        name="UserDashboard"
        component={UserTabNavigator}
        options={{ animation: 'fade' }}
      />

      {/* Main App - Admin Mode */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminTabNavigator}
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
