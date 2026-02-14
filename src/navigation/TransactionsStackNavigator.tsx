/**
 * TransactionsStackNavigator
 * Navigation for transaction management
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TransactionsScreen } from '../screens/admin/transactions/TransactionsScreen';
import { AddTransactionScreen } from '../screens/admin/transactions/AddTransactionScreen';
import { TransactionDetailsScreen } from '../screens/admin/transactions/TransactionDetailsScreen';

const Stack = createNativeStackNavigator();

export const TransactionsStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="TransactionsList" component={TransactionsScreen} />
      <Stack.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    </Stack.Navigator>
  );
};
