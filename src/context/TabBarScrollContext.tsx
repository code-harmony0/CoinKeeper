import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

interface TabBarScrollContextType {
  scrollY: SharedValue<number>;
}

const TabBarScrollContext = createContext<TabBarScrollContextType | undefined>(undefined);

export const TabBarScrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const scrollY = useSharedValue(0);

  return (
    <TabBarScrollContext.Provider value={{ scrollY }}>
      {children}
    </TabBarScrollContext.Provider>
  );
};

export const useTabBarScroll = () => {
  const context = useContext(TabBarScrollContext);
  if (!context) {
    throw new Error('useTabBarScroll must be used within a TabBarScrollProvider');
  }
  return context;
};
