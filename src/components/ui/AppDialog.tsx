import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';

export interface DialogAction {
  label: string;
  onPress?: () => void;
  /** Red, and never the first thing a thumb lands on. */
  destructive?: boolean;
  /** Closes without doing anything. Rendered last, quietly. */
  cancel?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  actions: DialogAction[];
  onClose: () => void;
}

const DIALOG_SPRING = { damping: 20, stiffness: 260 };

/**
 * The app's own dialog, in place of Android's.
 *
 * `Alert.alert` draws in the platform's colours, not the app's, cannot be
 * dismissed by tapping away, and stacks invisibly when two fire in a row —
 * which read as a dialog that would not go away. This one is themed, closes on
 * a backdrop tap, and lists its actions one per line so a long, honest label
 * fits instead of being squeezed onto a shared row.
 */
export const AppDialog: React.FC<Props> = ({ visible, title, message, actions, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();

  const scale = useSharedValue(0.92);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 160 });
      scale.value = withSpring(1, DIALOG_SPRING);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 140 });
      scale.value = withTiming(0.92, { duration: 140 });
    }
  }, [visible, backdropOpacity, scale]);

  const animatedBackdrop = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const animatedCard = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  const ordered = [...actions.filter(a => !a.cancel), ...actions.filter(a => a.cancel)];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedBackdrop]}>
          <Pressable
            testID="dialog-backdrop"
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]}
            onPress={onClose}
          />
        </Animated.View>

        {/* The card swallows every touch that lands on it. Without this, a tap
            near its edge passed through to whatever sat behind the dialog — a
            Settings row, in one case, which ran a destructive action nobody
            asked for. */}
        <Animated.View
          onStartShouldSetResponder={() => true}
          onTouchEnd={event => event.stopPropagation()}
          style={[
            styles.card,
            animatedCard,
            {
              backgroundColor: colors.card,
              borderRadius: cardRadius,
              marginBottom: insets.bottom,
              // In dark mode the card and the page behind it are a few points
              // apart, so the dialog's edge needs drawing rather than implying.
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {!!message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}

          <View style={styles.actions}>
            {ordered.map(action => (
              <Pressable
                key={action.label}
                testID={`dialog-action-${action.label}`}
                onPress={() => {
                  // Closed first: an action that opens the next dialog would
                  // otherwise stack behind this one, and dismissing the top one
                  // just revealed another.
                  onClose();
                  action.onPress?.();
                }}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: action.cancel
                      ? 'transparent'
                      : action.destructive
                        ? colors.danger + '1A'
                        : colors.chipBg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: action.destructive
                        ? colors.danger
                        : action.cancel
                          ? colors.textSecondary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { padding: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 20, fontFamily: 'Satoshi-Bold', marginBottom: 8 },
  message: { fontSize: 14, fontFamily: 'Satoshi-Medium', lineHeight: 20 },
  actions: { marginTop: 20, gap: 8 },
  action: { minHeight: 48, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 18 },
  actionText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
