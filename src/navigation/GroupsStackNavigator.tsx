/**
 * GroupsStackNavigator
 * Stack navigator for group management screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  GroupsScreen,
  GroupDetailsScreen,
  CreateGroupScreen,
  EditGroupScreen,
} from '../screens/admin/groups';
import { useAuth } from '../hooks/useAuth';

export type GroupsStackParamList = {
  GroupsList: undefined;
  GroupDetails: { groupId: string };
  CreateGroup: undefined;
  EditGroup: { groupId: string };
};

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export const GroupsStackNavigator: React.FC = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="GroupsList">
        {(props) => <GroupsScreen {...props} adminId={user?.uid || ''} />}
      </Stack.Screen>
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="CreateGroup">
        {(props) => <CreateGroupScreen {...props} adminId={user?.uid || ''} />}
      </Stack.Screen>
      <Stack.Screen name="EditGroup">
        {(props) => <EditGroupScreen {...props} adminId={user?.uid || ''} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
