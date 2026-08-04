import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { getPreference, setPreference } from '../../store/database';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius } = useSpecTheme();
  const [name, setName] = useState('');

  useEffect(() => {
    getPreference('profile_name').then(value => {
      if (value !== null) {
        setName(value);
      }
    });
  }, []);

  const handleChangeName = useCallback((value: string) => {
    setName(value);
    setPreference('profile_name', value).catch(error => {
      console.error('[ProfileScreen] Error saving profile_name preference:', error);
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
      <TextInput
        value={name}
        onChangeText={handleChangeName}
        placeholder="Your name"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.chipBg,
            color: colors.textPrimary,
            borderRadius: inputRadius,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black', marginBottom: 24 },
  input: { height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Satoshi-Medium' },
});
