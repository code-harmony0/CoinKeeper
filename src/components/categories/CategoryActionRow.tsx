import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trash2, Edit3, GitMerge } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  onEdit: () => void;
  onMerge: () => void;
  onDelete: () => void;
  deleteTestID?: string;
}

export const CategoryActionRow: React.FC<Props> = ({ onEdit, onMerge, onDelete, deleteTestID }) => {
  const { colors } = useSpecTheme();

  return (
    <View style={styles.actions}>
      <View style={styles.actionGroup}>
        <PressableScale onPress={onEdit} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <Edit3 size={16} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Edit</Text>
        </PressableScale>
        <PressableScale onPress={onMerge} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <GitMerge size={16} color={colors.textPrimary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>Merge</Text>
        </PressableScale>
      </View>
      <PressableScale onPress={onDelete} style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]} testID={deleteTestID}>
        <Trash2 size={16} color={colors.danger} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});
