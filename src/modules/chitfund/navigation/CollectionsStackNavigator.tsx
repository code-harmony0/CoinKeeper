import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ContributionsScreen } from '../screens/admin/collections/ContributionsScreen';
import { AddContributionScreen } from '../screens/admin/collections/AddContributionScreen';
import { ApproveContributionsScreen } from '../screens/admin/collections/ApproveContributionsScreen';
import { ContributionDetailScreen } from '../screens/admin/collections/ContributionDetailScreen';
import {
  UpcomingPaymentsScreen,
  OverduePaymentsScreen,
  PaymentHistoryScreen,
} from '../screens/admin/collections';

const Stack = createStackNavigator();

export const CollectionsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Contributions" component={ContributionsScreen} />
      <Stack.Screen name="ContributionDetail" component={ContributionDetailScreen} />
      <Stack.Screen name="AddContribution" component={AddContributionScreen} />
      <Stack.Screen name="ApproveContributions" component={ApproveContributionsScreen} />
      <Stack.Screen name="UpcomingPayments" component={UpcomingPaymentsScreen} />
      <Stack.Screen name="OverduePayments" component={OverduePaymentsScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
    </Stack.Navigator>
  );
};

export default CollectionsStackNavigator;
