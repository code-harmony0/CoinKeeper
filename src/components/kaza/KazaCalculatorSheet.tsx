import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useKazaTheme } from '../../theme/kazaTheme';
import { PressableScale } from '../anim';
import { KazaSheet } from './KazaSheet';
import { estimateMissedDays } from '../../services/kazaPlan';

interface Props {
  visible: boolean;
  /** Prayers per day being tracked (5, or 6 with Witr). */
  prayersPerDay: number;
  onClose: () => void;
  onSave: (missedDays: number) => void;
}

const MAX_AGE = 100;

const toAge = (text: string) => {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Two questions answer almost everyone, so those are all that is asked up
 * front. Excused days sit behind one optional row. The result updates live and
 * a bad range is explained in place instead of leaving the button dead.
 */
export const KazaCalculatorSheet: React.FC<Props> = ({
  visible,
  prayersPerDay,
  onClose,
  onSave,
}) => {
  const { colors, inputRadius } = useKazaTheme();
  const [pubertyAge, setPubertyAge] = useState('15');
  const [prayingSinceAge, setPrayingSinceAge] = useState('');
  const [cycleDays, setCycleDays] = useState('');
  const [postpartumDays, setPostpartumDays] = useState('');
  const [showExcused, setShowExcused] = useState(false);

  const puberty = toAge(pubertyAge);
  const since = toAge(prayingSinceAge);
  const error = useMemo(() => {
    if (prayingSinceAge.trim() === '') return null;
    if (puberty <= 0 || puberty > MAX_AGE || since > MAX_AGE) {
      return `Enter ages between 1 and ${MAX_AGE}.`;
    }
    if (since <= puberty) {
      return 'You started praying at or before you became obliged, so there is nothing to make up.';
    }
    return null;
  }, [prayingSinceAge, puberty, since]);

  const days = error
    ? 0
    : estimateMissedDays({
        pubertyAge: puberty,
        prayingSinceAge: since,
        cycleDaysPerMonth: toAge(cycleDays),
        postpartumDays: toAge(postpartumDays),
      });
  const ready = days > 0;

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: inputRadius,
      color: colors.textPrimary,
    },
  ];

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    hint?: string,
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        maxLength={5}
        style={inputStyle}
      />
    </View>
  );

  return (
    <KazaSheet visible={visible} title="Calculate my Kaza" onClose={onClose}>
      {field(
        'Age you became obliged to pray',
        pubertyAge,
        setPubertyAge,
        'e.g. 15',
        '15 is the usual default. Choose earlier if you may have been obliged sooner.',
      )}
      {field(
        'Age you started praying regularly',
        prayingSinceAge,
        setPrayingSinceAge,
        'e.g. 25',
      )}

      <PressableScale
        onPress={() => setShowExcused(v => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showExcused }}
        style={styles.toggle}
      >
        <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
          Excused days (optional)
        </Text>
        {showExcused ? (
          <ChevronUp size={18} color={colors.textPrimary} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={colors.textPrimary} strokeWidth={2} />
        )}
      </PressableScale>
      {showExcused && (
        <>
          {field(
            'Excused days each month',
            cycleDays,
            setCycleDays,
            'e.g. 7',
          )}
          {field(
            'Total postpartum days',
            postpartumDays,
            setPostpartumDays,
            'e.g. 40',
          )}
        </>
      )}

      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.result,
          { backgroundColor: error ? colors.expenseTint : colors.chipBg },
        ]}
      >
        {error ? (
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            {error}
          </Text>
        ) : ready ? (
          <>
            <Text style={[styles.resultNumber, { color: colors.textPrimary }]}>
              {(days * prayersPerDay).toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              prayers · about {days.toLocaleString('en-IN')} days. Anything you
              have already made up is kept and subtracted.
            </Text>
          </>
        ) : (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Enter the age you started praying to see your estimate.
          </Text>
        )}
      </View>

      <PressableScale
        onPress={() => onSave(days)}
        haptic="none"
        disabled={!ready}
        accessibilityRole="button"
        style={[
          styles.save,
          { backgroundColor: colors.primaryAccent },
          !ready && styles.disabled,
        ]}
      >
        <Text style={[styles.saveText, { color: colors.onAccent }]}>
          Set my Kaza
        </Text>
      </PressableScale>
    </KazaSheet>
  );
};

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'Satoshi-Bold', marginBottom: 4 },
  hint: { fontSize: 12, fontFamily: 'Satoshi-Regular', marginBottom: 8 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 18,
    fontFamily: 'Satoshi-Bold',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: 8,
  },
  toggleText: { fontSize: 14, fontFamily: 'Satoshi-Bold' },
  result: { borderRadius: 20, padding: 16, marginBottom: 16 },
  resultNumber: { fontSize: 36, lineHeight: 42, fontFamily: 'Satoshi-Black' },
  errorText: { fontSize: 14, fontFamily: 'Satoshi-Medium' },
  save: {
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
  disabled: { opacity: 0.4 },
});
