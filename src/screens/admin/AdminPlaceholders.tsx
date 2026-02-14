import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title, backgroundColor }: { title: string; backgroundColor: string }) => (
  <View style={[styles.container, { backgroundColor }]}>
    <Text style={styles.text}>{title}</Text>
  </View>
);

// Each tab gets its unique color from ExpandingTabBar
export const AdminApprovalsScreen = () => <PlaceholderScreen title="Admin Approvals" backgroundColor="#FFD4B8" />;
export const AdminSettingsScreen = () => <PlaceholderScreen title="Admin Settings" backgroundColor="#B8E6F5" />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121723',
  },
});
