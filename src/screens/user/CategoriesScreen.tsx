import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CategoryIntelligenceShell } from '../../components/categories/CategoryIntelligenceShell';

type Props = NativeStackScreenProps<any, 'Categories'>;

export const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  return <CategoryIntelligenceShell onGoBack={() => navigation.goBack()} />;
};

export default CategoriesScreen;
