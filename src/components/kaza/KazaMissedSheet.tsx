import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PRAYER_TINT, useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';

interface Props {
  visible: boolean;
  prayers: { name: string; arabic: string }[];
  onClose: () => void;
  onPick: (name: string) => void;
}

/** One tap adds a missed prayer to the backlog; no confirmation to wade through. */
export const KazaMissedSheet: React.FC<Props> = ({
  visible,
  prayers,
  onClose,
  onPick,
}) => {
  const { colors } = useKazaTheme();
  return (
    <KazaSheet
      visible={visible}
      title="Which prayer did you miss?"
      onClose={onClose}
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {prayers.map((prayer, i) => {
          const hue = PRAYER_TINT[prayer.name] ?? 'lavender';
          return (
            <PressableScale
              key={prayer.name}
              onPress={() => onPick(prayer.name)}
              accessibilityRole="button"
              accessibilityLabel={`I missed ${prayer.name}`}
              style={[
                styles.row,
                i < prayers.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors[hue],
                    borderColor: colors[`${hue}Deep` as const],
                  },
                ]}
              />
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {prayer.name}
              </Text>
              <Text style={[styles.arabic, { color: colors.textSecondary }]}>
                {prayer.arabic}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  name: { flex: 1, fontSize: 16, fontFamily: 'Satoshi-Medium' },
  arabic: { fontSize: 16, fontFamily: 'Satoshi-Regular' },
});
