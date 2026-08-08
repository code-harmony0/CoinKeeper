import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PartyPopper } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useSpecTheme } from '../../theme/specTheme';
import { Money } from '../../utils/money';

interface Props {
  visible: boolean;
  goalName: string;
  targetAmountPaise: number;
  onDismiss: () => void;
}

// The one moment in Goals that's supposed to feel like something, not just a
// state transition — a completed goal used to just flip a badge to green.
export const GoalCelebrationModal: React.FC<Props> = ({ visible, goalName, targetAmountPaise, onDismiss }) => {
  const { colors, cardRadius } = useSpecTheme();

  useEffect(() => {
    if (visible) {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Animated.View
          entering={ZoomIn.springify().damping(14).stiffness(140)}
          style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primaryAccent}18` }]}>
            <PartyPopper size={36} color={colors.primaryAccent} />
          </View>
          <Text variant="h2" style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 16 }}>
            Goal Achieved!
          </Text>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Satoshi-Bold', fontSize: 17, textAlign: 'center', marginTop: 8 }}>
            {goalName}
          </Text>
          <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
            You fully funded {Money.format(targetAmountPaise, { zeroDecimals: true })}. That's real, banked progress.
          </Text>
          <Button title="Nice" onPress={onDismiss} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
