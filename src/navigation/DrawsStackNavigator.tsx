import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  DrawsListScreen,
  DrawDetailsScreen,
  CreateDrawScreen,
  EditDrawScreen,
} from '../screens/admin/draws';

const Stack = createStackNavigator();

export const DrawsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="DrawsList" component={DrawsListScreen} />
      <Stack.Screen name="DrawDetails" component={DrawDetailsScreen} />
      <Stack.Screen name="CreateDraw" component={CreateDrawScreen} />
      <Stack.Screen name="EditDraw" component={EditDrawScreen} />
    </Stack.Navigator>
  );
};

export default DrawsStackNavigator;
