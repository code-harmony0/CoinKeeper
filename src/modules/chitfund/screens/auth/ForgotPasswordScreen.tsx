import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ForgotPasswordForm } from '../../components/auth';

const ForgotPasswordScreen = () => {
  return (
    <View style={styles.container}>
      <ForgotPasswordForm />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default ForgotPasswordScreen;
