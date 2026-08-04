/**
 * useTheme - Enhanced Theme Hook with Dark Mode Toggle
 * Provides theme colors, dark mode detection, and toggle functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeColors = {
  // Core
  primary: string;
  secondary: string;
  error: string;
  success: string;
  warning: string;
  
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  
  // UI Elements
  border: string;
  divider: string;
  inputBackground: string;
  placeholder: string;
  disabled: string;
  
  // Accents (for cards, tabs, etc.)
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  
  // Tab bar
  tabBarBg: string;
  tabBarBorder: string;
  tabBarInactive: string;
};

const lightColors: ThemeColors = {
  primary: '#121723',
  secondary: '#5856D6',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  
  background: '#F8FAFC',
  backgroundSecondary: '#E6F0FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F4F6F8',
  card: '#FFFFFF',
  
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  
  border: '#E5E7EB',
  divider: '#F1F5F9',
  inputBackground: '#FFFFFF',
  placeholder: '#9CA3AF',
  disabled: '#D1D5DB',
  
  accent1: '#D8E2FA',
  accent2: '#E2B6CF',
  accent3: '#98E4C1',
  accent4: '#FFD4B8',
  accent5: '#B8E6F5',
  
  tabBarBg: 'rgba(255,255,255,0.85)',
  tabBarBorder: 'rgba(255,255,255,0.3)',
  tabBarInactive: 'rgba(255,255,255,0.2)',
};

const darkColors: ThemeColors = {
  primary: '#F5F7FA',
  secondary: '#7B7AEA',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFA726',
  
  background: '#0F1419',
  backgroundSecondary: '#1A2027',
  surface: '#1E2530',
  surfaceSecondary: '#252D38',
  card: '#1E2530',
  
  text: '#F5F7FA',
  textSecondary: '#A0AEC0',
  textTertiary: '#718096',
  textOnPrimary: '#FFFFFF',
  
  border: '#2D3748',
  divider: '#2A3441',
  inputBackground: '#252D38',
  placeholder: '#718096',
  disabled: '#4A5568',
  
  accent1: '#2C3E50',
  accent2: '#4A1942',
  accent3: '#1E4D3D',
  accent4: '#4A3428',
  accent5: '#1E3A4A',
  
  tabBarBg: 'rgba(30,37,48,0.95)',
  tabBarBorder: 'rgba(255,255,255,0.1)',
  tabBarInactive: 'rgba(255,255,255,0.15)',
};

type ThemeMode = 'light' | 'dark' | 'system';

type Theme = {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Theme | null>(null);

const STORAGE_KEY = '@coinkeeper_theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (e) {
        // Use system default
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // Silent fail
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentIsDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
    setThemeMode(currentIsDark ? 'light' : 'dark');
  }, [themeMode, systemColorScheme, setThemeMode]);

  // Determine active theme
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const theme: Theme = {
    colors: isDark ? darkColors : lightColors,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  // Wait for theme to load before rendering
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
};

// Export colors for direct access if needed
export { lightColors, darkColors };
export type { ThemeColors, ThemeMode };

