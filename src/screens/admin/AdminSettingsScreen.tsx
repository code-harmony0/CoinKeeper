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
  TouchableOpacity,
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
  ChevronRight,
  Save,
  LogOut,
  Shield,
  Scale,
  AlertTriangle,
  ScrollText,
} from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../hooks/useTheme';

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
  const { colors, isDark, toggleTheme } = useTheme();
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
        if (doc.exists) {
          const data = doc.data();
          setSettings(prev => ({
            ...prev,
            displayName: data?.displayName || prev.displayName,
            email: data?.email || prev.email,
            upiId: data?.upiId || prev.upiId,
            language: data?.language || prev.language,
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
              routes: [{ name: 'Auth' }],
            });
          },
        },
      ]
    );
  }, [navigation]);

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.surface, borderBottomColor: colors.divider },
    headerTitle: { color: colors.text },
    headerSubtitle: { color: colors.textSecondary },
    sectionTitle: { color: colors.textSecondary },
    card: { backgroundColor: colors.card },
    settingLabel: { color: colors.text },
    settingDescription: { color: colors.textSecondary },
    profileNameInput: { color: colors.text },
    profileEmail: { color: colors.textSecondary },
    upiInput: { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    helperText: { color: colors.textTertiary },
    divider: { backgroundColor: colors.divider },
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Admin Configuration</Text>
        </Animated.View>

        {/* Profile Section */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatarLarge}>
                <User size={32} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.profileInfo}>
                <TextInput
                  style={styles.profileNameInput}
                  value={settings.displayName}
                  onChangeText={(text) => updateSetting('displayName', text)}
                  placeholder="Display Name"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.profileEmail}>{settings.email}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* UPI Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Collection</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                <CreditCard size={20} color="#2E7D32" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Admin UPI ID</Text>
                <TextInput
                  style={styles.upiInput}
                  value={settings.upiId}
                  onChangeText={(text) => updateSetting('upiId', text)}
                  placeholder="yourname@upi"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.helperText}>
                  Members will send payments to this UPI ID
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Appearance Section */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            {/* Theme Toggle */}
            <View style={styles.settingRow}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#4A3428' : '#FFF3E0' }]}>
                {isDark ? (
                  <Moon size={20} color="#FFA726" strokeWidth={2.5} />
                ) : (
                  <Sun size={20} color="#E65100" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  {isDark ? 'Dark theme active' : 'Enable dark theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Language */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                const nextLang = settings.language === 'en' ? 'hi' : 'en';
                updateSetting('language', nextLang);
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Globe size={20} color="#1565C0" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingDescription}>
                  {LANGUAGES.find(l => l.code === settings.language)?.label}
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Admin Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <View style={styles.card}>
            {/* Audit Log */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation?.navigate?.('AuditLog')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                <FileText size={20} color="#7B1FA2" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Audit Log</Text>
                <Text style={styles.settingDescription}>View all admin actions</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Permissions & Roles */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation?.navigate?.('PermissionsRoles')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
                <Shield size={20} color="#00796B" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Permissions & Roles</Text>
                <Text style={styles.settingDescription}>Manage user access control</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Security */}
            <TouchableOpacity style={styles.settingRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Shield size={20} color="#2E7D32" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Security</Text>
                <Text style={styles.settingDescription}>PIN, biometrics, 2FA</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Legal & Compliance Section */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Compliance</Text>
          <View style={styles.card}>
            {/* Legal Disclaimer */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                Alert.alert(
                  'Legal Disclaimer',
                  'CoinKeeper is a payment tracking tool only. It does NOT collect, hold, process, or transfer any funds. All payments happen directly between members outside the app. The app only records and confirms payment activity.\n\nCoinKeeper is not a financial institution, payment processor, or money transmitter. Use at your own discretion.',
                  [{ text: 'I Understand' }],
                );
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Scale size={20} color="#E65100" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Legal Disclaimer</Text>
                <Text style={styles.settingDescription}>View app disclaimer</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                Alert.alert(
                  'Terms & Conditions',
                  '1. CoinKeeper tracks payments only — no money is held.\n2. All chit fund activities are governed by local laws.\n3. Admins are responsible for compliance with applicable regulations.\n4. CoinKeeper is not liable for disputes between members.\n5. Data is stored securely on Firebase servers.\n6. Users may request data deletion at any time.\n7. Draw results are final once confirmed by admin.',
                  [{ text: 'Close' }],
                );
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <ScrollText size={20} color="#1565C0" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Terms & Conditions</Text>
                <Text style={styles.settingDescription}>Usage terms and policies</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Risk Acknowledgment */}
            <TouchableOpacity
              style={styles.settingRow}
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
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FFF8E1' }]}>
                <AlertTriangle size={20} color="#F9A825" strokeWidth={2.5} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Risk Acknowledgment</Text>
                <Text style={styles.settingDescription}>Financial risk disclosure</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#C62828" strokeWidth={2.5} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#121723',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
    padding: 0,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121723',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  upiInput: {
    fontSize: 15,
    color: '#121723',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: '#121723',
    borderRadius: 16,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    gap: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C62828',
  },
});

export default AdminSettingsScreen;
