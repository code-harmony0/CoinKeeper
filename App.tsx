import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/hooks/useTheme';
import { TransactionsProvider } from './src/context/TransactionsContext';
import { TabBarScrollProvider } from './src/context/TabBarScrollContext';
import { AppLockProvider } from './src/context/AppLockContext';
import { RootNavigator } from './src/navigation';
import { LogBox } from 'react-native';
import { disableSecureScreen } from './src/native/SecureScreen';

LogBox.ignoreLogs([
  'forwardRef render functions accept exactly two parameters',
  'Mock sign-in anonymously failed'
]);
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

  // FLAG_SECURE lives on the window, so it outlives the screen that set it: if
  // the focus cleanup misses once (backgrounded mid-screen, a reload), every
  // later screen inherits it and the whole app stops being screenshottable.
  // Clearing it once on mount costs nothing — screens that want it set it again
  // on focus. It has to be an effect: at module scope there is no Activity yet
  // and the native call quietly does nothing.
  React.useEffect(() => {
    disableSecureScreen();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <TransactionsProvider>
              <ChitFundsProvider>
                <TabBarScrollProvider>
                  <AppLockProvider>
                    <StatusBar
                      barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                    />
                    <RootNavigator />
                  </AppLockProvider>
                </TabBarScrollProvider>
              </ChitFundsProvider>
            </TransactionsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default App;
