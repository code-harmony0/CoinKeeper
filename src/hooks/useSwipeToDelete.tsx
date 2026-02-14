import { useCallback } from 'react';
import { PanGestureHandlerGestureEvent, PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedGestureHandler, useSharedValue, useAnimatedStyle, withSpring, runOnJS, Animated } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { springConfigs } from '../utils/animationUtils'; // Reusing defined spring configs

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // Distance to swipe to trigger delete

/**
 * Hook to provide swipe-to-delete functionality for a list item.
 * Encapsulates gesture handling and Reanimated logic.
 *
 * @param onDelete Callback function to execute when the item is swiped past the threshold.
 * @returns An object containing:
 *   - `panGestureHandler`: The PanGestureHandler component.
 *   - `animatedStyle`: The Reanimated style to apply to the swipable item.
 *   - `translateX`: The shared value for horizontal translation, useful for other animations.
 */
export const useSwipeToDelete = (onDelete: (id: string) => void, itemId: string) => {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(70); // Placeholder height, should ideally come from item's actual height
  const opacity = useSharedValue(1);

  const panGestureEvent = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: (event) => {
      // If swiped far enough, trigger delete and animate out
      if (translateX.value < -SWIPE_THRESHOLD || translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * Math.sign(event.translationX), springConfigs.quick, () => {
          opacity.value = withTiming(0, { duration: 200 }); // Fade out
          itemHeight.value = withTiming(0, { duration: 300 }, () => {
            runOnJS(onDelete)(itemId); // Execute delete callback on JS thread
          });
        });
      } else {
        // Snap back if not swiped far enough
        translateX.value = withSpring(0, springConfigs.responsive);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: itemHeight.value,
    opacity: opacity.value,
  }));

  // Render prop for PanGestureHandler to be applied to the item
  const panGestureHandler = useCallback((children: React.ReactNode) => (
    <PanGestureHandler onGestureEvent={panGestureEvent}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  ), [panGestureEvent, animatedStyle]); // Dependencies for useCallback

  return {
    panGestureHandler,
    translateX, // Expose translateX for potential foreground animations (e.g., delete button appearing)
  };
};
