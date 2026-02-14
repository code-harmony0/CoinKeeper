import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { BottomBar, TabName } from '../components/navigation';

// Placeholder screens - replace with actual screens
const HomeScreen = () => <View style={styles.screen} />;
const GroupsScreen = () => <View style={styles.screen} />;
const ApprovalsScreen = () => <View style={styles.screen} />;
const SettingsScreen = () => <View style={styles.screen} />;

const Tab = createBottomTabNavigator();

interface BottomTabsProps {
  onFabPress?: () => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ onFabPress }) => {
  const handleTabChange = (tab: TabName, index: number) => {
    console.log('Tab changed:', tab, index);
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={() => null}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Groups" component={GroupsScreen} />
        <Tab.Screen name="Approvals" component={ApprovalsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <BottomBar
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
