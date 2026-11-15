import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** The bottom sheet every Kaza flow shares: dim backdrop, title, close. */
export const KazaSheet: React.FC<Props> = ({ visible, title, onClose, children }) => {
  const { colors } = useKazaTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* No-op press: taps inside the sheet must not reach the backdrop's close. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <PressableScale
              onPress={onClose}
              hitSlop={4}
              accessibilityLabel="Close"
              style={[styles.close, { backgroundColor: colors.chipBg }]}
            >
              <X size={20} color={colors.textPrimary} strokeWidth={2} />
            </PressableScale>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, opacity: 0.35, marginBottom: 14 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: 'Satoshi-Bold' },
  close: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
