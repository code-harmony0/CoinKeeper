import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type TabParamList = {
  Home: undefined;
  Expenses: undefined;
  Transactions: undefined;
  Members: undefined;
  Draw: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type TabScreenProps<T extends keyof TabParamList> = BottomTabScreenProps<TabParamList, T>;
