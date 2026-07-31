/**
 * TransactionDetailsScreen
 * Detailed view of a transaction
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../../../../../theme';

// Placeholder for now, can be expanded later
export const TransactionDetailsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { transactionId } = route.params ?? {};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#121723" />
        </Pressable>
        <Text style={styles.title}>Transaction Details</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>ID: {transactionId}</Text>
        <Text style={styles.subtext}>Full details coming soon...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  backButton: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, ...theme.shadows.soft },
  title: { fontSize: 20, fontWeight: '700', color: '#121723' },
  content: { padding: 20, alignItems: 'center', marginTop: 40 },
  text: { fontSize: 18, fontWeight: '600', color: '#121723', marginBottom: 8 },
  subtext: { fontSize: 14, color: theme.colors.textSecondary },
});
