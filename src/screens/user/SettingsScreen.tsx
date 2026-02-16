/**
 * SettingsScreen - Blob Theme
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  User, 
  Bell, 
  Lock, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon
} from 'lucide-react-native';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_TYPOGRAPHY } from '../../theme/blobTheme';
import { BlobCard } from '../../components/blob/BlobCard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<any, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', onPress: () => {} },
        { icon: CreditCard, label: 'Payment Methods', onPress: () => {} },
        { icon: Lock, label: 'Security', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: Moon, 
          label: 'Dark Mode', 
          toggle: true, 
          value: darkMode, 
          onToggle: setDarkMode 
        },
        { 
          icon: Bell, 
          label: 'Notifications', 
          toggle: true, 
          value: notifications, 
          onToggle: setNotifications 
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', onPress: () => {} },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME_COLORS.background, THEME_COLORS.backgroundGradient3]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <BlobCard style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>User</Text>
              <Text style={styles.profileEmail}>user@example.com</Text>
            </View>
            <ChevronRight size={20} color={THEME_COLORS.textMuted} strokeWidth={2} />
          </BlobCard>
        </Animated.View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <Animated.View
            key={group.title}
            entering={FadeInDown.delay(150 + groupIndex * 50)}
          >
            <Text style={styles.groupTitle}>{group.title}</Text>
            <BlobCard style={styles.groupCard}>
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      if (!item.toggle) {
                        ReactNativeHapticFeedback.trigger('impactLight');
                        item.onPress?.();
                      }
                    }}
                    style={[
                      styles.settingItem,
                      itemIndex < group.items.length - 1 && styles.settingItemBorder,
                    ]}
                  >
                    <View style={styles.settingIcon}>
                      <Icon size={20} color={THEME_COLORS.textPrimary} strokeWidth={2} />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={(val) => {
                          ReactNativeHapticFeedback.trigger('impactLight');
                          item.onToggle?.(val);
                        }}
                        trackColor={{ false: THEME_COLORS.surfaceTint, true: THEME_COLORS.success }}
                        thumbColor={THEME_COLORS.surface}
                      />
                    ) : (
                      <ChevronRight size={18} color={THEME_COLORS.textMuted} strokeWidth={2} />
                    )}
                  </Pressable>
                );
              })}
            </BlobCard>
          </Animated.View>
        ))}

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Pressable
            onPress={() => ReactNativeHapticFeedback.trigger('impactMedium')}
            style={styles.logoutButton}
          >
            <LogOut size={20} color={THEME_COLORS.errorText} strokeWidth={2} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
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
    paddingHorizontal: THEME_SPACING.xl,
    paddingBottom: THEME_SPACING.lg,
  },
  headerTitle: {
    ...THEME_TYPOGRAPHY.h2,
    color: THEME_COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: THEME_SPACING.xl,
  },
  
  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME_SPACING.xl,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_COLORS.backgroundGradient3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME_SPACING.md,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textPrimary,
  },
  profileEmail: {
    ...THEME_TYPOGRAPHY.bodySmall,
    color: THEME_COLORS.textSecondary,
  },
  
  // Groups
  groupTitle: {
    ...THEME_TYPOGRAPHY.bodySmall,
    color: THEME_COLORS.textSecondary,
    marginBottom: THEME_SPACING.sm,
    marginLeft: THEME_SPACING.xs,
  },
  groupCard: {
    marginBottom: THEME_SPACING.lg,
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME_SPACING.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.surfaceTint,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME_COLORS.surfaceTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME_SPACING.sm,
  },
  settingLabel: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textPrimary,
    flex: 1,
  },
  
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME_SPACING.sm,
    paddingVertical: THEME_SPACING.lg,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: THEME_RADIUS.xl,
    ...THEME_SHADOWS.card,
  },
  logoutText: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.errorText,
  },
});

export default SettingsScreen;
