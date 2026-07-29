import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserDashboardScreen, TransactionsScreen, SettingsScreen } from '../screens/user';
import { ExpandingTabBar } from '../components/shared/ExpandingTabBar';
import { AddScreen } from '../screens/user/AddScreen';
import { KazaScreen } from '../screens/user/KazaScreen';
import { CHITFUND_ENABLED, ISLAMIC_ENABLED } from '../config/buildFlags';
import { getPreference } from '../store/database';
import { getUserTabs } from './userTabs';

const Tab = createBottomTabNavigator();

export const KAZA_PINNED_KEY = 'kazaPinned';

// Guarded require: CHITFUND_ENABLED is inlined at build time, so the lite
// bundle never resolves the chit-fund screen.
const ChitsScreen = process.env.CK_CHITFUND === '1'
  ? require('../modules/chitfund/screens/GroupsScreen').GroupsScreen
  : null;

export const UserTabNavigator: React.FC = () => {
  const [kazaPinned, setKazaPinned] = useState(false);

  useEffect(() => {
    if (!ISLAMIC_ENABLED) return;
    getPreference(KAZA_PINNED_KEY).then(v => setKazaPinned(v === 'true'));
  }, []);

  const tabs = getUserTabs({
    chitFund: CHITFUND_ENABLED,
    islamic: ISLAMIC_ENABLED,
    kazaPinned,
  });

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ExpandingTabBar {...props} tabs={tabs} hasFab fabIndex={2} />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={UserDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      {ISLAMIC_ENABLED && kazaPinned && <Tab.Screen name="Kaza" component={KazaScreen} />}
      {ChitsScreen && <Tab.Screen name="Chits" component={ChitsScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default UserTabNavigator;
