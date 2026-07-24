/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { setupGlobalFont } from './src/theme/fonts';

// Force Satoshi on every Text/TextInput app-wide (incl. legacy fontWeight-only
// styles that would otherwise render in the OS system font). See src/theme/fonts.ts.
setupGlobalFont();

AppRegistry.registerComponent(appName, () => App);
