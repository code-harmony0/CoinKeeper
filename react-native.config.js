// Autolinking runs through the React Native CLI (see
// `autolinkLibrariesFromCommand()` in android/settings.gradle), so this file is
// evaluated with the build's environment available.
//
// The lite flavor must ship with no Firebase at all — not just no Firebase JS.
// Nulling the android platform here keeps @react-native-firebase out of
// settings.gradle and out of the generated PackageList, so the native libraries
// never enter the lite APK.
//
// CK_CHITFUND=1 is set by the `android:pro` npm script. android/app/build.gradle
// fails the build loudly if a Pro variant is assembled without it, rather than
// producing a pro APK with Firebase silently missing.
const withFirebase = process.env.CK_CHITFUND === '1';

const firebaseModules = [
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  '@react-native-firebase/firestore',
  '@react-native-firebase/functions',
];

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./android/app/src/main/assets/fonts'],
  dependencies: withFirebase
    ? {}
    : Object.fromEntries(
        firebaseModules.map(name => [name, { platforms: { android: null } }]),
      ),
};
