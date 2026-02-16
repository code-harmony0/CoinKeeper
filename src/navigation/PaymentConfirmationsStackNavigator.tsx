import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PendingConfirmationsScreen } from '../screens/admin/payments/PendingConfirmationsScreen';
import { ConfirmationDetailScreen } from '../screens/admin/payments/ConfirmationDetailScreen';

const Stack = createStackNavigator();

export const PaymentConfirmationsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="PendingConfirmations" component={PendingConfirmationsScreen} />
      <Stack.Screen name="ConfirmationDetail" component={ConfirmationDetailScreen} />
    </Stack.Navigator>
  );
};

export default PaymentConfirmationsStackNavigator;
