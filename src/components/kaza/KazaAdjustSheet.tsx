import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';
import type { KazaPrayer } from '../../store/kazaStore';

interface Props {
  visible: boolean;
  prayers: KazaPrayer[];
  onClose: () => void;
  onSave: (entries: { name: string; pending: number }[]) => void;
}

/** Estimates are approximate — set what is really left for each prayer. */
export const KazaAdjustSheet: React.FC<Props> = ({ visible, prayers, onClose, onSave }) => {
  const { colors } = useKazaTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) setValues(Object.fromEntries(prayers.map(p => [p.name, String(p.pending)])));
  }, [visible, prayers]);

  const save = () =>
    onSave(
      prayers
        .map(p => ({ name: p.name, pending: parseInt(values[p.name] ?? '', 10) }))
        .filter(e => Number.isFinite(e.pending)),
    );

  return (
    <KazaSheet visible={visible} title="Adjust what's left" onClose={onClose}>
      <Text style={[styles.intro, { color: colors.sectionLabel }]}>
        Set the number still to make up for each prayer. What you have already made up is kept.
      </Text>
      {prayers.map(prayer => (
        <View key={prayer.name} style={styles.row}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{prayer.name}</Text>
          <TextInput
            value={values[prayer.name] ?? ''}
            onChangeText={t => setValues(prev => ({ ...prev, [prayer.name]: t.replace(/\D/g, '') }))}
            keyboardType="number-pad"
            selectTextOnFocus
            accessibilityLabel={`${prayer.name} left`}
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.textPrimary },
            ]}
          />
        </View>
      ))}
      <PressableScale
        onPress={save}
        haptic="none"
        style={[styles.save, { backgroundColor: colors.primaryAccent }]}
      >
        <Text style={[styles.saveText, { color: colors.onAccent }]}>Save</Text>
      </PressableScale>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  intro: { fontSize: 14, fontFamily: 'Satoshi-Regular', lineHeight: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  input: {
    minWidth: 120,
    textAlign: 'right',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
  },
  save: { borderRadius: 999, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
