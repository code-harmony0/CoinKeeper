import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useAnimatedGestureHandler,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Text } from '../ui/Text';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';

interface Props {
  icon: React.ReactNode;
  name: string;
  percentage: number;
  rupees: number;
  recommendedRange: string;
  color: string;
  onChange: (newPercent: number) => void;
  insights: string;
  includedExpenses: string;
  topCategories?: string[];
  trend?: { direction: 'up' | 'down' | 'flat'; pct: number };
  pacePrediction?: { projectedTotal: number; onTrack: boolean } | null;
}

export const ExpandableCategoryCard: React.FC<Props> = ({
  icon,
  name,
  percentage,
  rupees,
  recommendedRange,
  color,
  onChange,
  insights,
  includedExpenses,
  topCategories,
  trend,
  pacePrediction,
}) => {
  const { colors, cardRadius, cardShadow, iconShadow } = useSpecTheme();
  const [expanded, setExpanded] = useState(false);
  
  const contentHeight = useSharedValue(0);
  const rStyle = useAnimatedStyle(() => ({
    height: withSpring(expanded ? contentHeight.value + 88 : 88, {
      damping: 20,
      stiffness: 90,
    }),
    overflow: 'hidden',
  }));

  const handleMinus = () => {
    const step = percentage % 5 === 0 ? 5 : 1;
    onChange(Math.max(0, percentage - step));
  };
  const handlePlus = () => {
    const step = percentage % 5 === 0 ? 5 : 1;
    onChange(Math.min(100, percentage + step));
  };

  // 1. Reanimated Drag Physics
  const TRACK_WIDTH = Dimensions.get('window').width - 48 - 64 - 100; // Approx track width (padding + buttons)
  const isDragging = useSharedValue(false);
  const dragX = useSharedValue(0);

  // Sync dragX with external percentage changes (e.g., presets)
  React.useEffect(() => {
    if (!isDragging.value) {
      dragX.value = (percentage / 100) * TRACK_WIDTH;
    }
  }, [percentage, TRACK_WIDTH]);

  // Derived percentage for UI thread rendering
  const animatedPercentage = useDerivedValue(() => {
    if (isDragging.value) {
      return Math.min(100, Math.max(0, (dragX.value / TRACK_WIDTH) * 100));
    }
    return percentage;
  });

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      isDragging.value = true;
      ctx.startX = dragX.value;
    },
    onActive: (event, ctx) => {
      let newX = ctx.startX + event.translationX;
      newX = Math.max(0, Math.min(newX, TRACK_WIDTH));
      dragX.value = newX;
    },
    onEnd: () => {
      isDragging.value = false;
      const finalPercent = Math.round((dragX.value / TRACK_WIDTH) * 100);
      runOnJS(onChange)(finalPercent);
    },
  });

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${animatedPercentage.value}%`,
    backgroundColor: color,
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    height: withSpring(isDragging.value ? 16 : 12, { damping: 15, stiffness: 150 }),
  }));

  return (
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderRadius: cardRadius,
        ...cardShadow,
      },
      rStyle
    ]}>
      <TouchableOpacity 
        style={styles.headerRow} 
        activeOpacity={0.7} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }, iconShadow]}>
          {icon}
        </View>
        <View style={styles.headerInfo}>
          <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Black', letterSpacing: 0.5 }}>{name}</Text>
          <Text variant="caption" style={{ color: color, fontFamily: 'Satoshi-Bold', marginTop: 2 }}>{percentage}% • ₹{rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</Text>
        </View>
        <View style={styles.expandIcon}>
          {expanded ? <ChevronUp color={colors.textSecondary} size={20} /> : <ChevronDown color={colors.textSecondary} size={20} />}
        </View>
      </TouchableOpacity>

      <View 
        style={[styles.expandedContent, { position: 'absolute', top: 88, left: 0, right: 0 }]}
        onLayout={(e) => { contentHeight.value = e.nativeEvent.layout.height; }}
      >
        <View style={[styles.unifiedTrack, { backgroundColor: colors.surfaceSunken }]}>
          <TouchableOpacity onPress={handleMinus} style={[styles.ctrlBtn, { backgroundColor: colors.chipBg }]} hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <Minus color={colors.textPrimary} size={18} />
          </TouchableOpacity>

          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.sliderTrack, { backgroundColor: colors.chipBg }, animatedTrackStyle]}>
              <Animated.View style={[styles.sliderFill, animatedFillStyle]} />
            </Animated.View>
          </PanGestureHandler>

          <TouchableOpacity onPress={handlePlus} style={[styles.ctrlBtn, { backgroundColor: colors.chipBg }]} hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <Plus color={colors.textPrimary} size={18} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.insightsBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
              Recommended
            </Text>
            <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold' }}>
              {recommendedRange}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
              Includes
            </Text>
            <Text variant="caption" style={{ color: colors.textSecondary, flex: 1, textAlign: 'right', marginLeft: 16 }}>
              {includedExpenses}
            </Text>
          </View>
          
          {topCategories && topCategories.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Top Spending
              </Text>
              <Text variant="caption" style={{ color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {topCategories.join(', ')}
              </Text>
            </View>
          )}

          {trend && trend.direction !== 'flat' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Trend
              </Text>
              <Text variant="caption" style={{ color: trend.direction === 'up' ? colors.danger : colors.success, fontFamily: 'Satoshi-Bold' }}>
                {trend.direction === 'up' ? '▲' : '▼'} {Math.abs(trend.pct)}% vs last month
              </Text>
            </View>
          )}

          {pacePrediction && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontFamily: 'Satoshi-Medium', letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                Prediction
              </Text>
              <Text variant="caption" style={{ color: pacePrediction.onTrack ? colors.success : colors.danger, flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {pacePrediction.onTrack ? 'On track to finish ' : 'Projected to exceed budget: '}
                ₹{pacePrediction.projectedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month
              </Text>
            </View>
          )}

          <View style={[styles.aiTip, { backgroundColor: `${color}10`, borderLeftColor: color, borderLeftWidth: 3 }]}>
            <Text variant="caption" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Medium', lineHeight: 18 }}>
              <Text style={{ fontFamily: 'Satoshi-Bold', color }}>Insight: </Text>{insights}
            </Text>
          </View>
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
    height: 88, // taller header for premium feel
    paddingHorizontal: 20,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26, // circle, per DESIGN.md §6
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expandIcon: {
    padding: 8,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  unifiedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    height: 56,
    borderRadius: 28, // fully rounded pill
    paddingHorizontal: 8,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 6,
  },
  insightsBox: {
    paddingTop: 8,
  },
  aiTip: {
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  }
});
