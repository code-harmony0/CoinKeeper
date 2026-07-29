import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/hooks/useTheme';
import { TransactionsProvider } from './src/hooks/useTransactions';
import { TabBarScrollProvider } from './src/context/TabBarScrollContext';
import { RootNavigator } from './src/navigation';
import { CHITFUND_ENABLED } from './src/config/buildFlags';

// Firebase init, auth, and chit-fund state are pro-only. These requires sit
// behind a build-time constant, so Metro eliminates the branch and the lite
// bundle performs no Firebase initialisation at all.
const Passthrough: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

let AuthProvider: React.FC<{ children?: React.ReactNode }> = Passthrough;
let ChitFundsProvider: React.FC<{ children?: React.ReactNode }> = Passthrough;

if (process.env.CK_CHITFUND === '1') {
  require('./src/modules/chitfund/config/firebase'); // side effect: initialise Firebase
  AuthProvider = require('./src/modules/chitfund/hooks/useAuth').AuthProvider;
  ChitFundsProvider = require('./src/modules/chitfund/hooks/useChitFunds').ChitFundsProvider;
}

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
