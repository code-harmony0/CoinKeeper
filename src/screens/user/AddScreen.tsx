import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { AddTransactionSheet } from '../../components/modals/AddTransactionSheet';
import { useTransactionsContext as useTransactions } from '../../context/TransactionsContext';
import { useSpecTheme } from '../../theme/specTheme';

export const AddScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { colors } = useSpecTheme();
  const { addTransaction } = useTransactions();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFocused) {
      // Delay mounting the bottom sheet to ensure React Navigation
      // stack transitions have completed. This fixes the blank screen
      // bug when navigating to this tab from deeply nested stack screens.
      timer = setTimeout(() => {
        setVisible(true);
      }, 150);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [isFocused]);

  const closeSheet = () => {
    setVisible(false);
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AddTransactionSheet
        visible={visible}
        initialType={route.params?.type === 'income' ? 'income' : 'expense'}
        onClose={closeSheet}
        onSubmit={async (draft, type) => {
          try {
            await addTransaction({
              amountPaise: draft.amount_paise || 0,
              type: type || 'expense',
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
