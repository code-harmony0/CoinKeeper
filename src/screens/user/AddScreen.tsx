import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AddTransactionSheet } from '../../components/modals/AddTransactionSheet';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';

export const AddScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { addTransaction } = useTransactions();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setVisible(true);
    }
  }, [isFocused]);

  const closeSheet = () => {
    setVisible(false);
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <AddTransactionSheet
        visible={visible}
        onClose={closeSheet}
        onSubmit={async (draft) => {
          try {
            await addTransaction({
              amount: (draft.amount_paise || 0) / 100, // App stores rupees externally in Context still
              type: 'expense',
              category: draft.category_id || 'unknown',
              categoryIcon: 'other',
              description: draft.merchant_name || 'Unknown',
              paymentMethod: draft.payment_method ?? 'Manual',
              date: draft.date || new Date().toISOString(),
            });
            closeSheet();
          } catch (error) {
            Alert.alert('Could not save transaction', error instanceof Error ? error.message : 'Please try again.');
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default AddScreen;
