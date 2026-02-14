import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BodyText } from '../core/Typography';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { Calendar } from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onSelect,
}) => {
  if (!visible) return null;

  // Android-only: Use native Material You date picker
  return (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display="default"
      onChange={(event, date) => {
        if (event.type === 'set' && date) {
          onSelect(date);
        }
        onClose();
      }}
      maximumDate={new Date()}
    />
  );
};

// Date display component for the form
interface DateDisplayProps {
  date: Date;
  onPress: () => void;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({ date, onPress }) => {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Pressable onPress={onPress} style={styles.dateDisplay}>
      <Calendar size={20} color={COLORS.babyBlue} strokeWidth={2} />
      <BodyText medium color={COLORS.navyText}>
        {formatDate(date)}
      </BodyText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(189, 224, 254, 0.2)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.babyBlue,
  },
});
