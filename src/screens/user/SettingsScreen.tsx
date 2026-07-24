/**
 * SettingsScreen - Spec Theme
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, Switch, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Moon,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { getPreference, setPreference } from '../../store/database';
import { PressableScale } from '../../components/anim';
import {
  SettingsCard,
  SettingsDivider,
  SettingsSectionTitle,
  SettingsRow,
  LogoutButton,
} from '../../components/shared/SettingsRow';
import { SETTINGS_TINTS, ICON_CONTAINER_SIZE, ICON_CONTAINER_RADIUS } from '../../theme/settingsIcons';

type Props = NativeStackScreenProps<any, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, cardShadow, isDark: specIsDark } = useSpecTheme();
  const { isDark, toggleTheme } = useTheme();
  const { userProfile, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);

  // Hydrate notifications preference from local SQLite
  useEffect(() => {
    const loadPref = async () => {
      const value = await getPreference('notifications');
      if (value !== null) {
        setNotifications(value === 'on');
      }
    };
    loadPref();
  }, []);

  const handleToggleNotifications = useCallback(async (val: boolean) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setNotifications(val);
    try {
      await setPreference('notifications', val ? 'on' : 'off');
    } catch (error) {
      console.error('[SettingsScreen] Error saving notifications preference:', error);
    }
  }, []);

  const handleLogout = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  }, [signOut, navigation]);

  const handleDarkModeToggle = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    toggleTheme();
  }, [toggleTheme]);

  const handleInertPress = useCallback(() => {
    // No-op placeholder for unimplemented rows; SettingsRow provides the tap feedback.
  }, []);

  const profileIconPair = SETTINGS_TINTS.blue[specIsDark ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 144 },
        ]}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify().delay(50)}>
          <View>
            <PressableScale
              onPress={handleInertPress}
              style={[
                styles.profileCard,
                { backgroundColor: colors.card, borderRadius: cardRadius },
                cardShadow,
              ]}
            >
              <View style={[styles.avatarBox, { backgroundColor: profileIconPair.bg }]}>
                <User size={26} color={profileIconPair.icon} strokeWidth={2.5} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                  {userProfile?.name || 'User'}
                </Text>
                <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>
                  {userProfile?.phoneNumber || ''}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
            </PressableScale>
          </View>
        </Animated.View>

        {/* ACCOUNT */}
        <Animated.View entering={FadeInDown.springify().delay(100)}>
          <SettingsSectionTitle>ACCOUNT</SettingsSectionTitle>
          <SettingsCard style={styles.groupCard}>
            <SettingsRow icon={User} tint="blue" label="Profile" onPress={handleInertPress} />
            <SettingsDivider />
            <SettingsRow icon={CreditCard} tint="green" label="Payment Methods" onPress={handleInertPress} />
            <SettingsDivider />
            <SettingsRow icon={Shield} tint="teal" label="Security" onPress={handleInertPress} />
          </SettingsCard>
        </Animated.View>

        {/* PREFERENCES */}
        <Animated.View entering={FadeInDown.springify().delay(160)}>
          <SettingsSectionTitle>PREFERENCES</SettingsSectionTitle>
          <SettingsCard style={styles.groupCard}>
            <SettingsRow
              icon={Moon}
              tint="orange"
              label="Dark Mode"
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: colors.inputBg, true: colors.success }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingsDivider />
            <SettingsRow
              icon={Bell}
              tint="indigo"
              label="Notifications"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.inputBg, true: colors.success }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </SettingsCard>
        </Animated.View>

        {/* SUPPORT */}
        <Animated.View entering={FadeInDown.springify().delay(220)}>
          <SettingsSectionTitle>SUPPORT</SettingsSectionTitle>
          <SettingsCard style={styles.groupCard}>
            <SettingsRow icon={HelpCircle} tint="purple" label="Help Center" onPress={handleInertPress} />
          </SettingsCard>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.springify().delay(280)}>
          <LogoutButton onPress={handleLogout} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Satoshi-Black',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 32,
  },
  avatarBox: {
    width: ICON_CONTAINER_SIZE + 16,
    height: ICON_CONTAINER_SIZE + 16,
    borderRadius: ICON_CONTAINER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Satoshi-Bold',
  },
  profilePhone: {
    fontSize: 13,
    fontFamily: 'Satoshi-Regular',
    marginTop: 2,
  },

  // Groups
  groupCard: {
    marginBottom: 24,
  },
});

export default SettingsScreen;
