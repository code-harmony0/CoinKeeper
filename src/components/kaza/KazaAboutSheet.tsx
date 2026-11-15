import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { KazaSheet } from './KazaSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What Kaza is',
    body: 'Kaza (قضاء) means making up prayers that were missed. Get a starting estimate with “Calculate my Kaza”, then log each prayer you make up. A day counts toward your streak when you make up at least one.',
  },
  {
    title: 'A common way to begin',
    body: 'Pray today’s prayers on time, add one make-up beside each, then increase as you can.',
  },
  {
    title: 'Order',
    body: 'In the Hanafi school, if you owe fewer than six prayers they are made up in order before the current prayer. For a longer backlog, order is not required. The “Next” tag follows the daily order and is optional.',
  },
  {
    title: 'When not to pray',
    body: 'In the Hanafi school, make-up prayers are not valid at sunrise, midday (zawal) or sunset. A prayer missed while travelling is made up as 2 rakat (SeekersGuidance).',
  },
  {
    title: 'Age of puberty',
    body: 'If there were no earlier signs, 15 lunar years is the usual default. To be safe, choose an earlier age if you may have been obliged sooner. Any extra counts as voluntary prayer.',
  },
];

/** The guidance that used to be a single wall-of-text alert, now scannable. */
export const KazaAboutSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useKazaTheme();
  return (
    <KazaSheet visible={visible} title="About Kaza" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {SECTIONS.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {s.title}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {s.body}
            </Text>
          </View>
        ))}
        <Text style={[styles.note, { color: colors.sectionLabel }]}>
          This is a guide, not a ruling. Ask a scholar about your own
          situation.
        </Text>
      </ScrollView>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  title: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Satoshi-Regular' },
  note: { fontSize: 12, fontFamily: 'Satoshi-Medium', marginBottom: 8 },
});
