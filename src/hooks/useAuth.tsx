import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, UserProfile } from '../services/authService';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signInWithPhoneNumber: (phoneNumber: string) => Promise<FirebaseAuthTypes.ConfirmationResult>;
  confirmCode: (confirmation: FirebaseAuthTypes.ConfirmationResult, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TEMPORARY: Mock user for development
  const MOCK_MODE = true;

  useEffect(() => {
    if (MOCK_MODE) {
      // Set a mock user immediately
      const mockUser = {
        uid: 'mock-user-123',
        phoneNumber: '+91 9876543210',
      } as FirebaseAuthTypes.User;
      
      const mockProfile: UserProfile = {
        uid: 'mock-user-123',
        phoneNumber: '+91 9876543210',
        isAdmin: false,
        onboardingCompleted: true,
      };

      setUser(mockUser);
      setUserProfile(mockProfile);
      setIsLoading(false);
      return;
    }

    // Listen for authentication state changes
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        // User is signed in, get their profile from Firestore
        setIsLoading(true);
        const profile = await authService.getUserProfile(authUser.uid);
        setUserProfile(profile);
      } else {
        // User is signed out
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [MOCK_MODE]);

  const signInWithPhoneNumber = async (phoneNumber: string) => {
    setIsLoading(true);
    try {
        const confirmation = await authService.signInWithPhoneNumber(phoneNumber);
        return confirmation;
    } catch(error) {
        // Error is logged in the service
        throw error;
    } finally {
        setIsLoading(false);
    }
  };

  const confirmCode = async (confirmation: FirebaseAuthTypes.ConfirmationResult, code: string) => {
    setIsLoading(true);
    try {
        await authService.confirmCode(confirmation, code);
        // auth state change will be handled by the listener
    } catch(error) {
        // Error is logged in the service
        throw error;
    } finally {
        setIsLoading(false);
    }
  }

  const signOut = async () => {
    setIsLoading(true);
    try {
        await authService.signOut();
    } catch (error) {
        // Error is logged in the service
    } finally {
        setIsLoading(false);
    }
  };

  const isAdmin = userProfile?.isAdmin === true;

  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isAdmin,
    signInWithPhoneNumber,
    confirmCode,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};