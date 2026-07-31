import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AddTransactionSheet } from '../../components/modals/AddTransactionSheet';
import { useTransactions } from '../../hooks/useTransactions';

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
        initialType="expense"
        onSubmit={async (payload) => {
          try {
            await addTransaction({
              amount: payload.amount,
              type: payload.type,
              category: payload.category,
              categoryIcon: payload.categoryIcon || 'other',
              description: payload.description,
              paymentMethod: payload.paymentMethod ?? 'Manual',
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
