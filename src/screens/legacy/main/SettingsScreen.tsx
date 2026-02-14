import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const settings = [
    {
      title: 'Account',
      icon: 'account-outline',
      onPress: () => console.log('Account settings'),
      type: 'navigate',
    },
    {
      title: 'Notifications',
      icon: 'bell-outline',
      type: 'toggle',
      value: notificationsEnabled,
      onValueChange: setNotificationsEnabled,
    },
    {
      title: 'Appearance',
      icon: 'theme-light-dark',
      type: 'toggle',
      value: darkMode,
      onValueChange: setDarkMode,
      subtitle: 'Dark Mode',
    },
    {
      title: 'Security',
      icon: 'shield-account',
      onPress: () => console.log('Security settings'),
      type: 'navigate',
    },
    {
      title: 'Biometric Login',
      icon: 'fingerprint',
      type: 'toggle',
      value: biometricEnabled,
      onValueChange: setBiometricEnabled,
      subtitle: 'Use fingerprint or face ID to log in',
    },
    {
      title: 'Currency',
      icon: 'currency-usd',
      onPress: () => console.log('Currency settings'),
      type: 'navigate',
      subtitle: 'USD - US Dollar',
    },
    {
      title: 'Language',
      icon: 'translate',
      onPress: () => console.log('Language settings'),
      type: 'navigate',
      subtitle: 'English',
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => console.log('Help & Support'),
      type: 'navigate',
    },
    {
      title: 'About',
      icon: 'information-outline',
      onPress: () => console.log('About'),
      type: 'navigate',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {settings.slice(0, 3).map((item, index) => (
          <SettingItem key={index} item={item} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        {settings.slice(3, 5).map((item, index) => (
          <SettingItem key={index} item={item} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        {settings.slice(5, 9).map((item, index) => (
          <SettingItem key={index} item={item} />
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>CoinKeeper v1.0.0</Text>
    </ScrollView>
  );
};

const SettingItem = ({ item }: { item: any }) => {
  return (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={item.type === 'navigate' ? item.onPress : null}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${getIconColor(item.icon)}20` }]}>
          <Icon 
            name={item.icon} 
            size={20} 
            color={getIconColor(item.icon)}
          />
        </View>
        <View>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
        </View>
      </View>
      
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{ false: '#f4f4f4', true: '#6200EE' }}
          thumbColor="#fff"
        />
      ) : (
        <Icon name="chevron-right" size={24} color="#999" />
      )}
    </TouchableOpacity>
  );
};

const getIconColor = (iconName: string) => {
  switch (iconName) {
    case 'account-outline':
      return '#6200EE';
    case 'bell-outline':
      return '#FF6D00';
    case 'theme-light-dark':
      return '#00B0FF';
    case 'shield-account':
      return '#00C853';
    case 'fingerprint':
      return '#9C27B0';
    case 'currency-usd':
      return '#FFC107';
    case 'translate':
      return '#2196F3';
    case 'help-circle-outline':
      return '#FF5252';
    case 'information-outline':
      return '#9E9E9E';
    default:
      return '#6200EE';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  logoutButtonText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 24,
    fontSize: 12,
  },
});

export default SettingsScreen;
