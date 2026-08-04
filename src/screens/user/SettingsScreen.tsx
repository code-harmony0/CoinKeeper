/**
 * SettingsScreen - Spec Theme
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Switch, Alert } from 'react-native';
import Animated, { FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Moon,
  PieChart,
  Receipt,
  Target,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSpecTheme } from '../../theme/specTheme';
import { useOptionalAuth } from '../../hooks/useOptionalAuth';
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
  // Feeds the shared scroll offset the tab bar reads to auto-hide.
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const { colors, cardRadius, cardShadow, isDark, toggleTheme } = useSpecTheme();
  const { userProfile, signOut } = useOptionalAuth();
  const [notifications, setNotifications] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

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

  // Hydrate profile name preference from local SQLite
  useEffect(() => {
    const loadProfileName = async () => {
      const value = await getPreference('profile_name');
      if (value !== null) {
        setProfileName(value);
      }
    };
    loadProfileName();
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

  const profileIconPair = SETTINGS_TINTS.blue[isDark ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 144 },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify().delay(50)}>
          <View>
            <PressableScale
              onPress={() => navigation.navigate('Profile')}
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
                  {userProfile?.name || profileName || 'User'}
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
            <SettingsRow icon={User} tint="blue" label="Profile" onPress={() => navigation.navigate('Profile')} />
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
            <SettingsDivider />
            <SettingsRow 
              icon={PieChart} 
              tint="green" 
              label="Budget Rule" 
              onPress={() => navigation.navigate('Budget')} 
            />
            <SettingsDivider />
            <SettingsRow 
              icon={Receipt} 
              tint="orange" 
              label="Upcoming Bills" 
              onPress={() => navigation.navigate('Bills')} 
            />
            <SettingsDivider />
            <SettingsRow 
              icon={Target} 
              tint="purple" 
              label="Savings Goals" 
              onPress={() => navigation.navigate('Goals')} 
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
      </Animated.ScrollView>
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
    marginBottom: 32,
  },
});

export default SettingsScreen;
