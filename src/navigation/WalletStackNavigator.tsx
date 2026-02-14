import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  WalletOverviewScreen,
  AddFundsScreen,
  WithdrawFundsScreen,
  TransactionHistoryScreen,
} from '../screens/admin/wallet';

const Stack = createStackNavigator();

export const WalletStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="WalletOverview" component={WalletOverviewScreen} />
      <Stack.Screen name="AddFunds" component={AddFundsScreen} />
      <Stack.Screen name="WithdrawFunds" component={WithdrawFundsScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
    </Stack.Navigator>
  );
};

export default WalletStackNavigator;
