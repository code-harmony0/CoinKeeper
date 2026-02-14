import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ContributionsScreen } from '../screens/admin/collections/ContributionsScreen';
import { AddContributionScreen } from '../screens/admin/collections/AddContributionScreen';
import { ApproveContributionsScreen } from '../screens/admin/collections/ApproveContributionsScreen';
import { ContributionDetailScreen } from '../screens/admin/collections/ContributionDetailScreen';
// Legacy placeholder screens (can be replaced later)
import {
  UpcomingPaymentsScreen,
  OverduePaymentsScreen,
  PaymentHistoryScreen,
  AutoDebitSettingsScreen,
} from '../screens/admin/collections';

const Stack = createStackNavigator();

export const CollectionsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {/* Main Contributions Screen (replaces UpcomingPayments as default) */}
      <Stack.Screen name="Contributions" component={ContributionsScreen} />

      {/* Detail & Action Screens */}
      <Stack.Screen name="ContributionDetail" component={ContributionDetailScreen} />
      <Stack.Screen name="AddContribution" component={AddContributionScreen} />
      <Stack.Screen name="ApproveContributions" component={ApproveContributionsScreen} />

      {/* Legacy Screens (kept for backward compatibility) */}
      <Stack.Screen name="UpcomingPayments" component={UpcomingPaymentsScreen} />
      <Stack.Screen name="OverduePayments" component={OverduePaymentsScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="AutoDebitSettings" component={AutoDebitSettingsScreen} />
    </Stack.Navigator>
  );
};

export default CollectionsStackNavigator;
