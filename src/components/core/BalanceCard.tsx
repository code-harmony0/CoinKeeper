import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, radii, shadows } from '../../theme/designTokens';

export const BalanceCard = () => (
  <View style={styles.shadowContainer}>
    <LinearGradient colors={[colors.primary, '#6A75D9']} style={styles.container}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>$12,485.50</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  shadowContainer: {
    ...shadows.card,
    marginHorizontal: spacing.l,
    marginTop: spacing.m,
  },
  container: {
    borderRadius: radii.card,
    padding: spacing.l,
    alignItems: 'center',
  },
  label: {
    ...typography.balanceLabel as any,
    marginBottom: spacing.s,
  },
  balance: {
    ...typography.balanceAmount as any,
  },
});