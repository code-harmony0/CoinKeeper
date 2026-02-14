import { Easing, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Reusable animation utility functions and constants.
 * These ensure consistent animation behavior across the application.
 */

// --- Spring Animation Configurations ---
export const springConfigs = {
  // Gentle spring for subtle movements (e.g., card entry)
  gentle: {
    damping: 18,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 2,
  },
  // Responsive spring for interactive elements (e.g., FAB, drag gestures)
  responsive: {
    damping: 15,
    stiffness: 200,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 2,
  },
  // Quick spring for button presses or fast feedback
  quick: {
    damping: 20,
    stiffness: 250,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 2,
  },
};

// --- Timing Animation Configurations ---
export const timingConfigs = {
  // Standard duration for UI transitions
  standard: {
    duration: 300,
    easing: Easing.inOut(Easing.quad),
  },
  // Shorter duration for quick feedback
  short: {
    duration: 150,
    easing: Easing.inOut(Easing.quad),
  },
  // Longer duration for background changes or complex transitions
  long: {
    duration: 500,
    easing: Easing.inOut(Easing.quad),
  },
};

/**
 * Helper to apply a spring animation with a predefined config.
 * @param toValue The target value for the animation.
 * @param configName The name of the spring config to use ('gentle', 'responsive', 'quick').
 */
export const withAppSpring = (toValue: number, configName: keyof typeof springConfigs = 'responsive') => {
  return withSpring(toValue, springConfigs[configName]);
};

/**
 * Helper to apply a timing animation with a predefined config.
 * @param toValue The target value for the animation.
 * @param configName The name of the timing config to use ('standard', 'short', 'long').
 */
export const withAppTiming = (toValue: number, configName: keyof typeof timingConfigs = 'standard') => {
  return withTiming(toValue, timingConfigs[configName]);
};

// --- Other common animation patterns could go here ---
// e.g., useFadeIn, useSlideIn, etc. (as hooks if they encapsulate gesture/animation logic)
