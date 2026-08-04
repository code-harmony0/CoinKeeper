import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '../../components/ui/Text';
import { PressableScale } from '../../components/anim';
import { useSpecTheme } from '../../theme/specTheme';
import { getPreference, setPreference } from '../../store/database';

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius } = useSpecTheme();
  const [name, setName] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPreference('profile_name').then(value => {
      if (value !== null) {
        setName(value);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleChangeName = useCallback((value: string) => {
    setName(value);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setPreference('profile_name', value).catch(error => {
        console.error('[ProfileScreen] Error saving profile_name preference:', error);
      });
    }, 300);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <PressableScale onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.chipBg }]}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
      </View>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black' },
  input: { height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Satoshi-Medium' },
});
