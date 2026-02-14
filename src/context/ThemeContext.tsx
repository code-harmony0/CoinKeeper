/**
 * ThemeContext
 * Dark mode support with theme switching
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== LIGHT THEME COLORS ====================
const LIGHT_COLORS = {
  // Backgrounds
  background: '#F8FAFC',
  backgroundSecondary: '#E6F0FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F4F6F8',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Primary
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA2FF',

  // Accent colors (tab bar, cards)
  accent1: '#D8E2FA', // Blue
  accent2: '#E2B6CF', // Pink
  accent3: '#98E4C1', // Green
  accent4: '#FFD4B8', // Orange
  accent5: '#B8E6F5', // Cyan

  // Semantic
  success: '#2E7D32',
  successLight: '#E8F5E9',
  error: '#C62828',
  errorLight: '#FFEBEE',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: 'rgba(120, 120, 150, 0.12)',
  divider: '#F1F5F9',

  // Tab bar
  tabBarBg: 'rgba(255,255,255,0.15)',
  tabBarBorder: 'rgba(255,255,255,0.3)',
  tabBarInactive: 'rgba(255,255,255,0.2)',

  // Shadows
  shadowColor: '#000',
};

// ==================== DARK THEME COLORS ====================
const DARK_COLORS = {
  // Backgrounds
  background: '#0F1419',
  backgroundSecondary: '#1A2027',
  surface: '#1E2530',
  surfaceSecondary: '#252D38',
  surfaceElevated: '#2A3441',

  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#A0AEC0',
  textTertiary: '#718096',
  textOnPrimary: '#FFFFFF',

  // Primary
  primary: '#4DA2FF',
  primaryDark: '#007AFF',
  primaryLight: '#7AB8FF',

  // Accent colors (darker variants)
  accent1: '#2C3E50', // Blue
  accent2: '#4A1942', // Pink
  accent3: '#1E4D3D', // Green
  accent4: '#4A3428', // Orange
  accent5: '#1E3A4A', // Cyan

  // Semantic
  success: '#4CAF50',
  successLight: '#1B3D2F',
  error: '#EF5350',
  errorLight: '#3D1F1F',
  warning: '#FFA726',
  warningLight: '#3D2E1A',
  info: '#42A5F5',
  infoLight: '#1A2D3D',

  // Borders & Dividers
  border: '#2D3748',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  divider: '#2A3441',

  // Tab bar
  tabBarBg: 'rgba(30,37,48,0.95)',
  tabBarBorder: 'rgba(255,255,255,0.1)',
  tabBarInactive: 'rgba(255,255,255,0.15)',

  // Shadows
  shadowColor: '#000',
};

// ==================== THEME CONTEXT ====================
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  border: string;
  borderLight: string;
  divider: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarInactive: string;
  shadowColor: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@coinkeeper_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
        console.log('[ThemeContext] Could not load theme preference');
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
      console.log('[ThemeContext] Could not save theme preference');
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentIsDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
    setThemeMode(currentIsDark ? 'light' : 'dark');
  }, [themeMode, systemColorScheme, setThemeMode]);

  // Determine active theme
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value: ThemeContextType = {
    themeMode,
    isDark,
    colors,
    setThemeMode,
    toggleTheme,
  };

  if (!isLoaded) {
    return null; // Wait for preference to load
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export colors for reference
export { LIGHT_COLORS, DARK_COLORS };
export type { ThemeColors, ThemeMode };
