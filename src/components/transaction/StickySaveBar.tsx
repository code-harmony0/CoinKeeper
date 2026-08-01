import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CheckCircle2, ShieldAlert } from 'lucide-react-native';

interface Props {
  onSave: () => void;
  isValid: boolean;
  isLoading: boolean;
  isSuccess?: boolean;
  budgetImpact?: { exceedsBudget: boolean; remainingAfter: number } | null;
  predictionReason?: string;
  category?: string;
  amount?: number;
  customLabel?: string;
  customSubLabel?: string;
}

export const StickySaveBar: React.FC<Props> = ({ 
  onSave, 
  isValid, 
  isLoading, 
  isSuccess,
  budgetImpact,
  category,
  amount,
  customLabel,
  customSubLabel
}) => {
  const { colors, cardRadius } = useSpecTheme();

  let btnColor = colors.primaryAccent;
  let label = customLabel || `Save ${amount ? `₹${amount} ` : ''}Expense`;
  let subLabel = customSubLabel || (category ? `as ${category}` : (amount ? 'Categorizing...' : 'Enter amount'));
  
  if (budgetImpact?.exceedsBudget) {
    btnColor = (colors as any).warning || '#F59E0B';
    label = 'Save Anyway';
    subLabel = 'Budget Alert';
  }

  if (isSuccess) {
    btnColor = colors.success;
    label = 'Saved!';
    subLabel = 'Updating balances...';
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderRadius: cardRadius, borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.infoCol}>
        <Text style={[styles.subLabel, { color: budgetImpact?.exceedsBudget ? btnColor : colors.textSecondary }]}>
          {subLabel}
        </Text>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {budgetImpact?.exceedsBudget && <ShieldAlert size={14} color={btnColor} style={{ marginRight: 4 }}/>}
          {label}
        </Text>
      </View>
      
      <PressableScale 
        disabled={!isValid || isLoading || isSuccess} 
        onPress={onSave}
        style={[
          styles.btn, 
          { backgroundColor: isValid ? btnColor : colors.surfaceSunken, borderRadius: cardRadius - 4 }
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : isSuccess ? (
          <CheckCircle2 color="#fff" size={24} />
        ) : (
          <Text style={[styles.btnText, { color: isValid ? '#fff' : colors.textSecondary }]}>
            Save
          </Text>
        )}
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  infoCol: {
    flex: 1,
    paddingLeft: 4,
  },
  subLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  label: {
    fontFamily: 'Satoshi-Black',
    fontSize: 15,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  btnText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  }
});
