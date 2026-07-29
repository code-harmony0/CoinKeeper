/**
 * MembersStackNavigator
 * Stack navigator for Member Management flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MembersScreen } from '../screens/admin/members/MembersScreen';
import { MemberDetailsScreen } from '../screens/admin/members/MemberDetailsScreen';
import { AddMemberScreen } from '../screens/admin/members/AddMemberScreen';

const Stack = createNativeStackNavigator();

export const MembersStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersList" component={MembersScreen} />
      <Stack.Screen name="MemberDetails" component={MemberDetailsScreen} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} />
    </Stack.Navigator>
  );
};
