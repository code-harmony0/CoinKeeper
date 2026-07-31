import { initializeApp } from '@react-native-firebase/app';

// Your Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyBd6PXHdmhIEnm0i5zHyEkQhHkPEhF-pH0",
  authDomain: "coinkeeper-c53e7.firebaseapp.com",
  projectId: "coinkeeper-c53e7",
  storageBucket: "coinkeeper-c53e7.firebasestorage.app",
  messagingSenderId: "943091198939",
  appId: "1:943091198939:android:1207f262868d12e09455fe",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
