import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useDerivedValue,
  runOnJS,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, RoundedRect, Circle } from '@shopify/react-native-skia';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Text } from '../ui/Text';
import { PressableScale } from '../anim/PressableScale';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus, Plus } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  icon: React.ReactNode;
  name: string;
  percentage: number;
  rupees: number;
  recommendedRange: string;
  color: string;
  /**
   * Opaque background for the icon circle. Must be opaque: the circle carries
   * `iconShadow` (elevation), and Android renders that elevation *through* a
   * translucent background, muddying the pastel into grey.
   */
  tint?: string;
  onChange: (newPercent: number) => void;
  insights: string;
  includedExpenses: string;
  topCategories?: string[];
  trend?: { direction: 'up' | 'down' | 'flat'; pct: number };
  pacePrediction?: { projectedTotal: number; onTrack: boolean } | null;
}

// Haptic helper (runs on JS thread)
const triggerHaptic = () =>
  ReactNativeHapticFeedback.trigger('impactLight', {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  });

const SCREEN_WIDTH = Dimensions.get('window').width;
// Track width: screen - (24 outer pad × 2) - (20 card pad × 2) - (stepper × 2 + gap)
const TRACK_CONTAINER_WIDTH = SCREEN_WIDTH - 48 - 40 - 96;

const TRACK_H_COLLAPSED = 10;
const TRACK_H_ACTIVE = 14;
const TRACK_RADIUS = TRACK_H_ACTIVE / 2;
const THUMB_R = 12;
const CANVAS_H = THUMB_R * 2 + 4; // extra for shadow

export const ExpandableCategoryCard: React.FC<Props> = ({
  icon,
  name,
  percentage,
  rupees,
  recommendedRange,
  color,
  tint,
  onChange,
  insights,
  includedExpenses,
  topCategories,
  trend,
  pacePrediction,
}) => {
  const { colors, cardRadius, cardShadow, iconShadow, spring } = useSpecTheme();
  const [expanded, setExpanded] = useState(false);

  // ── Expand / collapse with measured height ────────────────────────────────
  const measuredHeight = useSharedValue(0);
  const isExpanded = useSharedValue(false);

  const expandStyle = useAnimatedStyle(() => ({
    height: withSpring(
      isExpanded.value ? measuredHeight.value + 88 : 88,
      { damping: 22, stiffness: 100 }
    ),
    overflow: 'hidden',
  }));

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    isExpanded.value = next;
  }, [expanded]);

  // ── Slider gesture (Gesture Handler v2 API) ───────────────────────────────
  const [trackWidth, setTrackWidth] = useState(TRACK_CONTAINER_WIDTH);

  const isDragging = useSharedValue(false);
  const dragX = useSharedValue((percentage / 100) * trackWidth);
  const startDragX = useSharedValue(0);
  const lastHapticVal = useSharedValue(percentage);

  // Sync when external value changes (preset applied, etc.)
  React.useEffect(() => {
    if (!isDragging.value) {
      dragX.value = withSpring((percentage / 100) * trackWidth, {
        damping: 20,
        stiffness: 100,
      });
      lastHapticVal.value = percentage;
    }
  }, [percentage, trackWidth]);

  const clampedPercent = useDerivedValue(() =>
    Math.min(100, Math.max(0, (dragX.value / trackWidth) * 100))
  );

  const applyChange = useCallback(
    (finalPercent: number) => {
      const snapped = Math.round(finalPercent / 5) * 5; // snap to 5%
      onChange(Math.min(100, Math.max(0, snapped)));
      triggerHaptic();
    },
    [onChange]
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      startDragX.value = dragX.value;
    })
    .onUpdate((e) => {
      const next = startDragX.value + e.translationX;
      dragX.value = Math.max(0, Math.min(next, trackWidth));
      
      const currentPercent = (dragX.value / trackWidth) * 100;
      const snapped = Math.min(100, Math.max(0, Math.round(currentPercent / 5) * 5));
      
      // Update state during drag so Visualizer reacts in real-time
      runOnJS(onChange)(snapped);
      
      if (snapped !== lastHapticVal.value) {
        lastHapticVal.value = snapped;
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      const finalPercent = (dragX.value / trackWidth) * 100;
      runOnJS(applyChange)(finalPercent);
    });

  // ── Skia slider animated styles ───────────────────────────────────────────
  const fillWidth = useDerivedValue(() =>
    Math.max(0, (clampedPercent.value / 100) * trackWidth)
  );
  const thumbX = useDerivedValue(() =>
    Math.max(THUMB_R, Math.min(fillWidth.value, trackWidth - THUMB_R))
  );
  const trackH = useDerivedValue(() =>
    withSpring(isDragging.value ? TRACK_H_ACTIVE : TRACK_H_COLLAPSED, {
      damping: 15,
      stiffness: 150,
    })
  );

  // ── Stepper buttons ────────────────────────────────────────────────────────
  const handleMinus = () => {
    const next = Math.max(0, percentage - 5);
    onChange(next);
    triggerHaptic();
  };

  const handlePlus = () => {
    const next = Math.min(100, percentage + 5);
    onChange(next);
    triggerHaptic();
  };

  // ── Trend chip ─────────────────────────────────────────────────────────────
  const trendColor =
    !trend || trend.direction === 'flat'
      ? colors.textSecondary
      : trend.direction === 'up'
      ? colors.danger
      : colors.mintDeep;
  const TrendIcon =
    trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : null;

  // ── Pace bar ──────────────────────────────────────────────────────────────
  const pacePct = pacePrediction
    ? Math.min(100, (pacePrediction.projectedTotal / (rupees || 1)) * 100)
    : 0;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: cardRadius,
          ...cardShadow,
        },
        expandStyle,
      ]}
    >
      {/* ── Header row ── */}
      <PressableScale onPress={handleToggle} style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: tint ?? `${color}15` }, iconShadow]}>
          {icon}
        </View>
        <View style={styles.headerInfo}>
          <Text
            variant="h3"
            style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', letterSpacing: 0.3 }}
          >
            {name}
          </Text>
          <Text
            variant="caption"
            style={{ color, fontFamily: 'Satoshi-Bold', marginTop: 3 }}
          >
            {percentage}% · ₹{rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
          </Text>
        </View>
        <View style={[styles.chevronBox, { backgroundColor: colors.chipBg }]}>
          {expanded ? (
            <ChevronUp color={colors.textSecondary} size={16} />
          ) : (
            <ChevronDown color={colors.textSecondary} size={16} />
          )}
        </View>
      </PressableScale>

      {/* ── Expanded content (measured for height animation) ── */}
      <View
        style={styles.expandedContent}
        onLayout={(e) => {
          measuredHeight.value = e.nativeEvent.layout.height;
        }}
      >
        {/* ── Slider row ── */}
        <View style={styles.sliderRow}>
          <PressableScale
            onPress={handleMinus}
            style={[styles.stepBtn, { backgroundColor: colors.chipBg }]}
          >
            <Minus color={colors.textPrimary} size={16} />
          </PressableScale>

          <GestureDetector gesture={panGesture}>
            <View
              style={styles.sliderTrackContainer}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            >
              <Canvas style={{ width: trackWidth, height: CANVAS_H }}>
                {/* Track background */}
                <RoundedRect
                  x={0}
                  y={CANVAS_H / 2 - TRACK_H_COLLAPSED / 2}
                  width={trackWidth}
                  height={trackH}
                  r={TRACK_RADIUS}
                  color={colors.surfaceSunken}
                />
                {/* Fill */}
                <RoundedRect
                  x={0}
                  y={CANVAS_H / 2 - TRACK_H_COLLAPSED / 2}
                  width={fillWidth}
                  height={trackH}
                  r={TRACK_RADIUS}
                  color={color}
                />
                {/* Thumb glow */}
                <Circle
                  cx={thumbX}
                  cy={CANVAS_H / 2}
                  r={THUMB_R + 5}
                  color={color}
                  opacity={0.12}
                />
                {/* Thumb fill */}
                <Circle
                  cx={thumbX}
                  cy={CANVAS_H / 2}
                  r={THUMB_R}
                  color={color}
                />
                {/* Thumb white stroke ring */}
                <Circle
                  cx={thumbX}
                  cy={CANVAS_H / 2}
                  r={THUMB_R - 2}
                  color="#FFFFFF"
                  opacity={0.5}
                />
              </Canvas>
            </View>
          </GestureDetector>

          <PressableScale
            onPress={handlePlus}
            style={[styles.stepBtn, { backgroundColor: colors.chipBg }]}
          >
            <Plus color={colors.textPrimary} size={16} />
          </PressableScale>
        </View>

        {/* ── Intelligence rows ── */}
        <View style={styles.intelBox}>

          {/* Recommended range */}
          <View style={styles.intelRow}>
            <Text
              variant="caption"
              style={[styles.intelLabel, { color: colors.textSecondary }]}
            >
              Recommended
            </Text>
            <View style={[styles.rangePill, { backgroundColor: `${color}12`, borderColor: `${color}30` }]}>
              <Text
                variant="caption"
                style={{ color, fontFamily: 'Satoshi-Bold', fontSize: 12 }}
              >
                {recommendedRange}
              </Text>
            </View>
          </View>

          {/* Top spending categories */}
          {topCategories && topCategories.length > 0 && (
            <View style={styles.intelRow}>
              <Text
                variant="caption"
                style={[styles.intelLabel, { color: colors.textSecondary }]}
              >
                Top Spending
              </Text>
              <Text
                variant="caption"
                style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', textAlign: 'right', flex: 1, marginLeft: 12 }}
                numberOfLines={1}
              >
                {topCategories.join(' · ')}
              </Text>
            </View>
          )}

          {/* Trend chip */}
          {trend && trend.direction !== 'flat' && TrendIcon && (
            <View style={styles.intelRow}>
              <Text
                variant="caption"
                style={[styles.intelLabel, { color: colors.textSecondary }]}
              >
                Trend
              </Text>
              <View style={[styles.trendChip, { backgroundColor: `${trendColor}12`, borderColor: `${trendColor}30` }]}>
                <TrendIcon color={trendColor} size={12} />
                <Text
                  variant="caption"
                  style={{ color: trendColor, fontFamily: 'Satoshi-Bold', fontSize: 12, marginLeft: 4 }}
                >
                  {Math.abs(trend.pct)}% vs last month
                </Text>
              </View>
            </View>
          )}

          {/* Pace prediction mini-bar */}
          {pacePrediction && (
            <View style={styles.paceBlock}>
              <View style={styles.intelRow}>
                <Text
                  variant="caption"
                  style={[styles.intelLabel, { color: colors.textSecondary }]}
                >
                  Month Pace
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: pacePrediction.onTrack ? colors.mintDeep : colors.danger,
                    fontFamily: 'Satoshi-Bold',
                    fontSize: 12,
                  }}
                >
                  {pacePrediction.onTrack ? 'On track' : 'Over budget'}
                </Text>
              </View>
              <View style={[styles.paceBg, { backgroundColor: colors.surfaceSunken }]}>
                <View
                  style={[
                    styles.paceFill,
                    {
                      width: `${pacePct}%`,
                      backgroundColor: pacePrediction.onTrack ? colors.mintDeep : colors.danger,
                    },
                  ]}
                />
              </View>
              <Text
                variant="caption"
                style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}
              >
                Projected: ₹{pacePrediction.projectedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month
              </Text>
            </View>
          )}

          {/* Insight block */}
          <View
            style={[
              styles.insightBlock,
              { backgroundColor: `${color}08`, borderLeftColor: color },
            ]}
          >
            <Text
              variant="caption"
              style={{ fontFamily: 'Satoshi-Bold', color, fontSize: 11, marginBottom: 3 }}
            >
              INSIGHT
            </Text>
            <Text
              variant="caption"
              style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18, fontSize: 13 }}
            >
              {insights}
            </Text>
          </View>

          {/* Includes */}
          <Text
            variant="caption"
            style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8, lineHeight: 16 }}
          >
            Includes: {includedExpenses}
          </Text>

        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 88,
    paddingHorizontal: 20,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  chevronBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Intelligence
  intelBox: {
    gap: 10,
  },
  intelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intelLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rangePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paceBlock: {
    gap: 4,
  },
  paceBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  paceFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightBlock: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 10,
    paddingRight: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
