/**
 * CoinKeeper Neumorphic Shadow System
 * Soft shadows with light source from top-left
 */

import { ViewStyle } from 'react-native';

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Neumorphic soft shadow (primary)
  neumorphic: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  // Neumorphic card elevation
  neumorphicCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  // Neumorphic button
  neumorphicButton: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  // Legacy shadows (backward compatibility)
  soft: {
    shadowColor: '#1E2A33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  medium: {
    shadowColor: '#1E2A33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  large: {
    shadowColor: '#1E2A33',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: '#1E2A33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export type ShadowType = keyof typeof SHADOWS;

// Helper function to get shadow style
export const getShadow = (type: ShadowType): ViewStyle => SHADOWS[type];

