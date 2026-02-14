import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/designTokens';

export const SectionHeader = ({ title, onSeeAll }: { title: string, onSeeAll?: () => void }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAll}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  title: {
    ...typography.section,
  },
  seeAll: {
    ...typography.body,
    color: colors.primary,
    fontFamily: 'Inter-Medium',
  },
});
