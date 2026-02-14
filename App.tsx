import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider } from './src/hooks/useTheme';
import { TransactionsProvider } from './src/hooks/useTransactions';
import { ChitFundsProvider } from './src/hooks/useChitFunds';
import { TabBarScrollProvider } from './src/context/TabBarScrollContext';
import { RootNavigator } from './src/navigation';
import './src/config/firebase'; // Initialize Firebase

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <TransactionsProvider>
            <ChitFundsProvider>
              <TabBarScrollProvider>
                <StatusBar
                  barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                />
                <RootNavigator />
              </TabBarScrollProvider>
            </ChitFundsProvider>
          </TransactionsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
