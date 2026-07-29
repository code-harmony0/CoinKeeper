/**
 * AdminSettingsScreen
 * Admin settings with profile, theme, language, UPI ID, and audit log
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Moon,
  Sun,
  Globe,
  CreditCard,
  FileText,
  Save,
  Shield,
  Scale,
  AlertTriangle,
  ScrollText,
  Bell,
} from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../../../hooks/useTheme';
import { useSpecTheme } from '../../../../theme/specTheme';
import {
  SettingsCard,
  SettingsDivider,
  SettingsSectionTitle,
  SettingsIconBox,
  SettingsRow,
  LogoutButton,
  SettingsPrimaryButton,
} from '../../../../components/shared/SettingsRow';

interface AdminSettings {
  displayName: string;
  email: string;
  upiId: string;
  language: 'en' | 'hi';
  notificationsEnabled: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

export const AdminSettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { colors } = useSpecTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    displayName: 'Admin',
    email: 'admin@coinkeeper.app',
    upiId: '',
    language: 'en',
    notificationsEnabled: true,
  });

  // Load settings from Firestore (with fallback to defaults)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const doc = await firestore().collection('adminSettings').doc('default').get();
        if ((doc as any).exists) {
          const data = doc.data();
          setSettings(prev => ({
            ...prev,
            displayName: data?.displayName || prev.displayName,
            email: data?.email || prev.email,
            upiId: data?.upiId || prev.upiId,
            language: data?.language || prev.language,
            notificationsEnabled: data?.notificationsEnabled !== undefined ? data.notificationsEnabled : prev.notificationsEnabled,
          }));
        }
      } catch (error) {
        console.log('[AdminSettingsScreen] Using default settings (Firestore unavailable)');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings to Firestore (with offline persistence)
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    ReactNativeHapticFeedback.trigger('impactLight');
    try {
      await firestore().collection('adminSettings').doc('default').set(settings, { merge: true });
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      Alert.alert('Saved', 'Settings updated successfully');
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert('Offline', 'Settings saved locally. Will sync when online.');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    toggleTheme();
  }, [toggleTheme]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            navigation?.reset?.({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Admin Configuration</Text>
        </Animated.View>

        {/* Profile Section */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
          <SettingsSectionTitle>Profile</SettingsSectionTitle>
          <SettingsCard>
            <View style={styles.profileRow}>
              <SettingsIconBox icon={User} tint="blue" size={64} />
              <View style={styles.profileInfo}>
                <TextInput
                  style={[styles.profileNameInput, { color: colors.textPrimary }]}
                  value={settings.displayName}
                  onChangeText={(text) => updateSetting('displayName', text)}
                  placeholder="Display Name"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{settings.email}</Text>
              </View>
            </View>
          </SettingsCard>
        </Animated.View>

        {/* UPI Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <SettingsSectionTitle>Payment Collection</SettingsSectionTitle>
          <SettingsCard>
            <SettingsRow icon={CreditCard} tint="green" label="Admin UPI ID">
              <TextInput
                style={[styles.upiInput, { color: colors.textPrimary, backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                value={settings.upiId}
                onChangeText={(text) => updateSetting('upiId', text)}
                placeholder="yourname@upi"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Members will send payments to this UPI ID
              </Text>
            </SettingsRow>
          </SettingsCard>
        </Animated.View>

        {/* Appearance Section */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <SettingsSectionTitle>Appearance</SettingsSectionTitle>
          <SettingsCard>
            {/* Theme Toggle */}
            <SettingsRow
              icon={isDark ? Moon : Sun}
              tint="orange"
              label="Dark Mode"
              description={isDark ? 'Dark theme active' : 'Enable dark theme'}
              showChevron={false}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: colors.border, true: colors.primaryAccent }}
                  thumbColor="#FFFFFF"
                />
              }
            />

            <SettingsDivider />

            {/* Push Notifications */}
            <SettingsRow
              icon={Bell}
              tint="indigo"
              label="Push Notifications"
              description="Enable push notifications for updates"
              showChevron={false}
              rightElement={
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(val) => updateSetting('notificationsEnabled', val)}
                  trackColor={{ false: colors.border, true: colors.primaryAccent }}
                  thumbColor="#FFFFFF"
                />
              }
            />

            <SettingsDivider />

            {/* Language */}
            <SettingsRow
              icon={Globe}
              tint="blue"
              label="Language"
              description={LANGUAGES.find(l => l.code === settings.language)?.label}
              onPress={() => {
                const nextLang = settings.language === 'en' ? 'hi' : 'en';
                updateSetting('language', nextLang);
              }}
            />
          </SettingsCard>
        </Animated.View>

        {/* Admin Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <SettingsSectionTitle>Administration</SettingsSectionTitle>
          <SettingsCard>
            {/* Audit Log */}
            <SettingsRow
              icon={FileText}
              tint="purple"
              label="Audit Log"
              description="View all admin actions"
              onPress={() => navigation?.navigate?.('AuditLog')}
            />

            <SettingsDivider />

            {/* Permissions & Roles */}
            <SettingsRow
              icon={Shield}
              tint="teal"
              label="Permissions & Roles"
              description="Manage user access control"
              onPress={() => navigation?.navigate?.('PermissionsRoles')}
            />

            <SettingsDivider />

            {/* Security */}
            <SettingsRow
              icon={Shield}
              tint="green"
              label="Security"
              description="PIN, biometrics, 2FA"
            />
          </SettingsCard>
        </Animated.View>

        {/* Legal & Compliance Section */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <SettingsSectionTitle>Legal & Compliance</SettingsSectionTitle>
          <SettingsCard>
            {/* Legal Disclaimer */}
            <SettingsRow
              icon={Scale}
              tint="orange"
              label="Legal Disclaimer"
              description="View app disclaimer"
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                Alert.alert(
                  'Legal Disclaimer',
                  'CoinKeeper is a payment tracking tool only. It does NOT collect, hold, process, or transfer any funds. All payments happen directly between members outside the app. The app only records and confirms payment activity.\n\nCoinKeeper is not a financial institution, payment processor, or money transmitter. Use at your own discretion.',
                  [{ text: 'I Understand' }],
                );
              }}
            />

            <SettingsDivider />

            {/* Terms & Conditions */}
            <SettingsRow
              icon={ScrollText}
              tint="blue"
              label="Terms & Conditions"
              description="Usage terms and policies"
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                Alert.alert(
                  'Terms & Conditions',
                  '1. CoinKeeper tracks payments only — no money is held.\n2. All chit fund activities are governed by local laws.\n3. Admins are responsible for compliance with applicable regulations.\n4. CoinKeeper is not liable for disputes between members.\n5. Data is stored securely on Firebase servers.\n6. Users may request data deletion at any time.\n7. Draw results are final once confirmed by admin.',
                  [{ text: 'Close' }],
                );
              }}
            />

            <SettingsDivider />

            {/* Risk Acknowledgment */}
            <SettingsRow
              icon={AlertTriangle}
              tint="amber"
              label="Risk Acknowledgment"
              description="Financial risk disclosure"
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                Alert.alert(
                  'Risk Acknowledgment',
                  'By using CoinKeeper, you acknowledge:\n\n• Chit fund participation carries financial risk\n• CoinKeeper does not guarantee payments or returns\n• Members may default on payments\n• Draw outcomes are based on bidding and cannot be reversed\n• Admin is solely responsible for group management\n• Local regulations on chit funds must be followed',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'I Acknowledge', style: 'destructive' },
                  ],
                );
              }}
            />
          </SettingsCard>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.actionsContainer}>
          <SettingsPrimaryButton label="Save Changes" icon={Save} onPress={saveSettings} loading={isSaving} />
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameInput: {
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  upiInput: {
    fontSize: 15,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
});

export default AdminSettingsScreen;
