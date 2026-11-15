import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { useKazaTone } from './kazaTone';
import type { Reflection } from '../../services/kazaInsights';

/** A verse or hadith matched to the moment — encouragement, never guilt. */
export const KazaReflection: React.FC<{ reflection: Reflection }> = ({ reflection }) => {
  const { cardRadius } = useKazaTheme();
  const tone = useKazaTone('lavender');
  return (
    <View
      accessible
      accessibilityLabel={`Reflection. ${reflection.text} ${reflection.source}`}
      style={[styles.card, { backgroundColor: tone.bg, borderRadius: cardRadius }]}
    >
      {reflection.arabic && <Text style={[styles.arabic, { color: tone.ink }]}>{reflection.arabic}</Text>}
      <Text style={[styles.text, { color: tone.ink }]}>{reflection.text}</Text>
      <Text style={[styles.source, { color: tone.inkMuted }]}>{reflection.source}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  arabic: { fontSize: 20, lineHeight: 32, textAlign: 'right', marginBottom: 8, fontFamily: 'Satoshi-Medium' },
  text: { fontSize: 14, lineHeight: 20, fontFamily: 'Satoshi-Medium' },
  source: { fontSize: 12, fontFamily: 'Satoshi-Bold', marginTop: 8 },
});
