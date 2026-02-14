import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AnimatedBottomBar, TabKey } from '../components/bottomBar';

// Placeholder screens - replace with actual Admin screens
const AdminHomeScreen = () => <View style={styles.screen} />;
const AdminGroupsScreen = () => <View style={styles.screen} />;
const AdminApprovalsScreen = () => <View style={styles.screen} />;
const AdminSettingsScreen = () => <View style={styles.screen} />;

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminGroups: undefined;
  AdminApprovals: undefined;
  AdminSettings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

interface AdminBottomTabsProps {
  onFabPress?: () => void;
}

export const AdminBottomTabs: React.FC<AdminBottomTabsProps> = ({ onFabPress }) => {
  const handleTabChange = (tab: TabKey, index: number) => {
    console.log('Admin tab changed:', tab, index);
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={() => null}
      >
        <Tab.Screen name="AdminHome" component={AdminHomeScreen} />
        <Tab.Screen name="AdminGroups" component={AdminGroupsScreen} />
        <Tab.Screen name="AdminApprovals" component={AdminApprovalsScreen} />
        <Tab.Screen name="AdminSettings" component={AdminSettingsScreen} />
      </Tab.Navigator>
      <AnimatedBottomBar
        initialTab="home"
        onTabChange={handleTabChange}
        onFabPress={onFabPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default AdminBottomTabs;
