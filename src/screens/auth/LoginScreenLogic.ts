import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// This file defines the functional logic and state management for the Login Screen.
// It handles phone number input, OTP sending, and OTP confirmation.

export const LoginScreenLogic = () => {
  const { signInWithPhoneNumber, confirmCode, isLoading } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCodeSent, setIsCodeSent] = useState<boolean>(false);

  // --- Input Validation ---
  const validatePhoneNumber = (number: string): boolean => {
    // Basic validation for E.164 format (e.g., +1234567890)
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(number);
  };

  const validateVerificationCode = (code: string): boolean => {
    return code.length === 6 && /^\d+$/.test(code);
  };

  // --- Handlers for sending OTP ---
  const handleSendCode = async () => {
    setError(null);
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    try {
      // Clear existing confirmation in case of retry
      setConfirmation(null);
      const result = await signInWithPhoneNumber(phoneNumber);
      setConfirmation(result);
      setIsCodeSent(true);
      // Implement haptic feedback or visual cue for code sent
      console.log('Verification code sent successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
      console.error('Error sending code:', err);
    }
  };

  // --- Handlers for confirming OTP ---
  const handleConfirmCode = async () => {
    setError(null);
    if (!confirmation) {
      setError('No verification process started.');
      return;
    }
    if (!validateVerificationCode(verificationCode)) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    try {
      await confirmCode(confirmation, verificationCode);
      // AuthProvider listener will handle navigation on successful login.
      console.log('Phone number verified successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please try again.');
      console.error('Error confirming code:', err);
    }
  };

  return {
    phoneNumber,
    setPhoneNumber,
    verificationCode,
    setVerificationCode,
    isCodeSent,
    isLoading,
    error,
    handleSendCode,
    handleConfirmCode,
  };
};
