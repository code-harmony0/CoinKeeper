import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  onDelete: () => void;
}

export const CategoryCleanupCTA: React.FC<Props> = ({ onDelete }) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>0 transactions — this category isn't in use.</Text>
      <PressableScale onPress={onDelete} style={[styles.deleteBtn, { backgroundColor: colors.danger + '15' }]}>
        <Trash2 size={14} color={colors.danger} />
        <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 16 },
  text: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium', marginRight: 8 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  deleteText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
