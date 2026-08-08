/**
 * RoomSwitcher — segmented control for the home screen's three rooms.
 * Mirrors the segmented control already used on Transactions/Reports so the
 * home screen doesn't invent a second switching idiom.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';

interface RoomSwitcherProps {
  rooms: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export const RoomSwitcher: React.FC<RoomSwitcherProps> = ({
  rooms,
  activeIndex,
  onChange,
}) => {
  const { colors, cardRadius, spring } = useSpecTheme();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - 8) / rooms.length;
    setSegmentWidth(width);
    indicatorX.value = activeIndex * width;
  };

  React.useEffect(() => {
    if (segmentWidth > 0) {
      indicatorX.value = withSpring(activeIndex * segmentWidth, spring);
    }
  }, [activeIndex, segmentWidth, indicatorX, spring]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  const handlePress = (index: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onChange(index);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.segmentInactiveBg }]}
      onLayout={onLayout}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.segmentActiveBg, borderRadius: cardRadius - 4 },
            indicatorStyle,
          ]}
        />
      )}
      {rooms.map((room, index) => {
        const isActive = activeIndex === index;
        return (
          <Pressable
            key={room}
            style={styles.item}
            onPress={() => handlePress(index)}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={room}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isActive
                    ? colors.segmentActiveText
                    : colors.segmentInactiveText,
                },
              ]}
            >
              {room}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
  },
  item: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontFamily: 'Satoshi-Bold',
  },
});

export default RoomSwitcher;
