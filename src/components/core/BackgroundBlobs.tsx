import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../../theme';

const { width, height } = Dimensions.get('window');

export const BackgroundBlobs: React.FC = () => {
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const blob3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate blobs subtly
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(blob1Anim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(blob2Anim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob3Anim, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(blob3Anim, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const blob1Transform = {
    transform: [
      {
        translateY: blob1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      },
      {
        scale: blob1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  const blob2Transform = {
    transform: [
      {
        translateX: blob2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 15],
        }),
      },
      {
        scale: blob2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      },
    ],
  };

  const blob3Transform = {
    transform: [
      {
        translateY: blob3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 25],
        }),
      },
    ],
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.blob, styles.blob1, blob1Transform]} />
      <Animated.View style={[styles.blob, styles.blob2, blob2Transform]} />
      <Animated.View style={[styles.blob, styles.blob3, blob3Transform]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blob1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: COLORS.babyBlue,
    opacity: 0.15,
    top: -width * 0.4,
    right: -width * 0.2,
  },
  blob2: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: COLORS.softPeach,
    opacity: 0.12,
    bottom: height * 0.1,
    left: -width * 0.3,
  },
  blob3: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: COLORS.lavender,
    opacity: 0.1,
    top: height * 0.3,
    left: width * 0.5,
  },
});
