import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const AUTO_LOCK_MS = 2 * 60 * 1000;

interface AppLockContextType {
  isLocked: boolean;
  unlock: () => void;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export const AppLockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true); // locked on cold start, always
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (next === 'active' && backgroundedAt.current !== null) {
        const elapsed = Date.now() - backgroundedAt.current;
        if (elapsed >= AUTO_LOCK_MS) {
          setIsLocked(true);
        }
        backgroundedAt.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);

  const unlock = () => setIsLocked(false);

  return (
    <AppLockContext.Provider value={{ isLocked, unlock }}>
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = (): AppLockContextType => {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
};
