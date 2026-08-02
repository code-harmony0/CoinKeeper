import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { EntrySource } from '../../types/transactionDraft';
import { Plus, Camera, MessageSquare } from 'lucide-react-native';

interface Props {
  activeMode: EntrySource;
  onModeChange: (mode: EntrySource) => void;
}

export const TransactionEntryModeTabs: React.FC<Props> = ({ activeMode, onModeChange }) => {
  const { colors, cardRadius } = useSpecTheme();

  const TABS = [
    { id: 'manual', label: 'Type', Icon: Plus },
    { id: 'sms', label: 'SMS', Icon: MessageSquare },
    { id: 'scan', label: 'Scan', Icon: Camera },
  ] as const;

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeMode === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onModeChange(tab.id as EntrySource)}
            style={[
              styles.tab,
              { 
                backgroundColor: isActive ? colors.primaryAccent : colors.chipBg,
                borderRadius: cardRadius - 4
              }
            ]}
          >
            <tab.Icon size={16} color={isActive ? '#fff' : colors.textSecondary} />
            <Text 
              style={[
                styles.label, 
                { color: isActive ? '#fff' : colors.textSecondary }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  label: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  }
});
