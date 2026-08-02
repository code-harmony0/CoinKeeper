import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GitMerge } from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';

interface Props {
  suggestedWithName: string;
  onConfirm: () => void;
}

export const CategoryMergeSuggestion: React.FC<Props> = ({ suggestedWithName, onConfirm }) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryAccent + '10', borderRadius: cardRadius }]}>
      <GitMerge size={16} color={colors.primaryAccent} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Looks like <Text style={{ fontFamily: 'Satoshi-Bold' }}>{suggestedWithName}</Text> — merge into this category?
      </Text>
      <PressableScale onPress={onConfirm} style={[styles.confirmBtn, { backgroundColor: colors.primaryAccent }]}>
        <Text style={styles.confirmText}>Merge</Text>
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, marginBottom: 16 },
  text: { flex: 1, fontSize: 13, fontFamily: 'Satoshi-Medium', lineHeight: 18 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  confirmText: { color: '#FFF', fontSize: 12, fontFamily: 'Satoshi-Bold' },
});
