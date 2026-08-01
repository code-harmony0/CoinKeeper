import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { Crosshair } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim/PressableScale';

interface Props {
  name: string;
  targetAmount: number;
  currentAmount: number;
  themeColor: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const SecondaryGoalCard: React.FC<Props> = ({
  name,
  targetAmount,
  currentAmount,
  themeColor,
  onPress,
  onLongPress
}) => {
  const { colors, cardRadius } = useSpecTheme();
  
  const percentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100)) || 0;
  const isComplete = currentAmount >= targetAmount;
  
  const fillWidth = useSharedValue(0);
  
  useEffect(() => {
    fillWidth.value = withSpring(percentage, { damping: 20, stiffness: 90 });
  }, [percentage]);
  
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`
  }));

  const accentColor = isComplete ? colors.success : themeColor;

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress}>
      <View style={[
        styles.card, 
        { 
          backgroundColor: colors.card,
          borderColor: isComplete ? `${colors.success}50` : colors.border,
          borderRadius: cardRadius,
        }
      ]}>
        
        <View style={styles.contentRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}15` }]}>
            <Crosshair color={accentColor} size={20} />
          </View>
          
          <View style={styles.infoCol}>
            <Text variant="h3" style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', marginBottom: 2 }} numberOfLines={1}>{name}</Text>
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              ₹{currentAmount.toLocaleString('en-IN')} / ₹{targetAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.percentCol}>
            <Text variant="h3" style={{ color: accentColor, fontFamily: 'Satoshi-Black' }}>{percentage}%</Text>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: colors.chipBg }]}>
          <Animated.View style={[
            styles.fill, 
            { backgroundColor: accentColor },
            fillStyle
          ]} />
        </View>
        
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  percentCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
