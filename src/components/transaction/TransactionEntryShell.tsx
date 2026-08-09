import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSpecTheme } from '../../theme/specTheme';
import { BlurView } from '@react-native-community/blur';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerContext?: string;
}

const SHEET_SPRING = { damping: 18, stiffness: 250 };

export const TransactionEntryShell: React.FC<Props> = ({ visible, onClose, children, footer, headerContext }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useSpecTheme();

  const translateY = useSharedValue(800);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SHEET_SPRING);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(800, { duration: 300 });
    }
  }, [visible]);

  const animatedBackdrop = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.keyboardAware} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, animatedBackdrop]}>
          <Pressable style={styles.flex1} onPress={onClose}>
            {Platform.OS === 'ios' && (
              <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={10} reducedTransparencyFallbackColor="rgba(0,0,0,0.8)" />
            )}
            {Platform.OS !== 'ios' && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            )}
          </Pressable>
        </Animated.View>

        <Animated.View style={[
          styles.sheet, 
          { backgroundColor: colors.background, paddingBottom: insets.bottom || 24, paddingTop: 16 }, 
          animatedSheet
        ]}>
          <View style={[styles.handlebar, { backgroundColor: colors.textSecondary + '40' }]} />
          
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>
              {headerContext || 'Add Transaction'}
            </Text>
          </View>
          
          <View style={styles.content}>
            {children}
          </View>

          {footer && (
            <View style={styles.footerContainer}>
              {footer}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAware: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  flex1: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    height: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  handlebar: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  }
});
