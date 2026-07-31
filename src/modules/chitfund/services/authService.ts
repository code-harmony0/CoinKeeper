import auth, {
  FirebaseAuthTypes,
  onAuthStateChanged as onFirebaseAuthStateChanged,
} from '@react-native-firebase/auth';
import { getDocument } from './firestoreService';
import { Platform } from 'react-native';

export interface UserProfile {
  uid: string;
  email?: string;
  name?: string;
  phoneNumber: string | null;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  // other user fields
}

/**
 * Sends a confirmation code to the user's phone number.
 * @param phoneNumber - The phone number to send the code to (in E.164 format).
 * @returns A confirmation result object.
 */
const signInWithPhoneNumber = async (
  phoneNumber: string,
): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  try {
    // On Android, phone auth is instant for verified numbers.
    // On iOS, it always requires OTP.
    // This flow handles both.
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    return confirmation;
  } catch (error) {
    console.error(
      `Error signing in with phone number [${phoneNumber}]:`,
      error,
    );
    throw error;
  }
};

/**
 * Confirms the OTP code sent to the user's phone.
 * @param confirmation - The confirmation result from signInWithPhoneNumber.
 * @param code - The 6-digit code entered by the user.
 * @returns The user credential.
 */
const confirmCode = async (
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
): Promise<FirebaseAuthTypes.UserCredential | null> => {
  try {
    const userCredential = await confirmation.confirm(code);
    return userCredential;
  } catch (error) {
    console.error(`Error confirming OTP code:`, error);
    throw error;
  }
};

/**
 * Signs the current user out.
 */
const signOut = async (): Promise<void> => {
  try {
    await auth().signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Subscribes to the user's authentication state changes.
 * @param callback - Function to be called when auth state changes.
 * @returns An unsubscribe function.
 */
const onAuthStateChanged = (
  callback: (user: FirebaseAuthTypes.User | null) => void,
) => {
  return onFirebaseAuthStateChanged(auth(), callback);
};

/**
 * Fetches the user's profile from the 'users' collection in Firestore.
 * This includes the critical 'isAdmin' role flag.
 * @param uid - The user's unique ID from Firebase Auth.
 * @returns The user profile data or null if not found.
 */
const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const doc = await getDocument<any>('users', uid);
    if (doc) {
      // Transform the document to match our UserProfile interface
      return {
        uid: doc.id,
        email: doc.email,
        name: doc.name,
        phoneNumber: doc.phoneNumber,
        isAdmin: doc.isAdmin || false,
        onboardingCompleted: doc.onboardingCompleted || false,
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user profile for [${uid}]:`, error);
    // If the profile doesn't exist, we might need to create it.
    // For now, we'll just return null.
    return null;
  }
};

export const authService = {
  signInWithPhoneNumber,
  confirmCode,
  signOut,
  onAuthStateChanged,
  getUserProfile,
};
