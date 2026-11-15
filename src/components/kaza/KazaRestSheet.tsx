import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';

const OPTIONS = [
  { days: 1, label: 'Today' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
}

export const KazaRestSheet: React.FC<Props> = ({ visible, onClose, onConfirm }) => {
  const { colors } = useKazaTheme();
  const [days, setDays] = useState(1);

  return (
    <KazaSheet visible={visible} title="Take a rest" onClose={onClose}>
      <Text style={[styles.body, { color: colors.sectionLabel }]}>
        Rest days pause your streak — they never break it. Use them for your period, travel or illness. You can end a rest
        early any time.
      </Text>
      {OPTIONS.map(option => (
        <PressableScale
          key={option.days}
          onPress={() => setDays(option.days)}
          accessibilityRole="button"
          accessibilityState={{ selected: days === option.days }}
          style={[styles.option, { backgroundColor: days === option.days ? colors.primaryAccent : colors.card }]}
        >
          <Text style={[styles.optionText, { color: days === option.days ? colors.onAccent : colors.textPrimary }]}>
            {option.label}
          </Text>
        </PressableScale>
      ))}
      <PressableScale
        onPress={() => onConfirm(days)}
        haptic="none"
        style={[styles.confirm, { backgroundColor: colors.primaryAccent }]}
      >
        <Text style={[styles.confirmText, { color: colors.onAccent }]}>Start rest</Text>
      </PressableScale>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: 14, fontFamily: 'Satoshi-Regular', lineHeight: 20, marginBottom: 16 },
  option: { borderRadius: 16, minHeight: 52, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  optionText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  confirm: { borderRadius: 999, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  confirmText: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
});
