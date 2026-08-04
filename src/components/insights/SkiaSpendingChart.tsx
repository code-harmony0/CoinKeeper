import React, { useEffect } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent, Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, useFont } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

interface Props {
  data: number[];
  labels: string[];
  width: number;
  height: number;
  color: string;
  textColor: string;
  gridColor: string;
}

export const SkiaSpendingChart: React.FC<Props> = ({
  data,
  labels,
  width,
  height,
  color,
  textColor,
  gridColor,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [data, progress]);

  // If no data or all zeros
  if (!data || data.length === 0 || Math.max(...data) === 0) {
    return <View style={{ width, height }} />;
  }

  const PADDING_TOP = 20;
  const PADDING_BOTTOM = 30;
  const PADDING_HORIZONTAL = 10;
  
  const innerWidth = width - PADDING_HORIZONTAL * 2;
  const innerHeight = height - PADDING_TOP - PADDING_BOTTOM;
  
  const maxVal = Math.max(...data) * 1.1; // 10% headroom

  const getPoint = (val: number, idx: number) => {
    const x = PADDING_HORIZONTAL + (idx / (data.length - 1)) * innerWidth;
    const y = PADDING_TOP + innerHeight - (val / maxVal) * innerHeight;
    return { x, y };
  };

  const points = data.map((val, i) => getPoint(val, i));

  // Build curved path
  let pathStr = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const controlX = (curr.x + next.x) / 2;
    pathStr += ` C ${controlX} ${curr.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  // Build shadow fill path
  const fillPathStr = `${pathStr} L ${points[points.length - 1].x} ${PADDING_TOP + innerHeight} L ${points[0].x} ${PADDING_TOP + innerHeight} Z`;

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {/* Fill Gradient */}
        <Path d={fillPathStr}>
          <LinearGradient
            start={vec(0, PADDING_TOP)}
            end={vec(0, PADDING_TOP + innerHeight)}
            colors={[`${color}20`, `${color}00`]}
          />
        </Path>

        {/* Line */}
        <Path
          d={pathStr}
          style="stroke"
          strokeWidth={3}
          color={color}
          strokeJoin="round"
          strokeCap="round"
        />
      </Canvas>

      {/* Labels overlay */}
      <View style={[styles.labelsContainer, { height: PADDING_BOTTOM }]}>
        {labels.map((label, i) => (
          <Text key={i} style={[styles.labelText, { color: textColor }]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  labelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Medium',
  },
});
