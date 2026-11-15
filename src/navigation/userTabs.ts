export type ModuleFlags = {
  /** Chit fund module — pro flavor only. */
  chitFund: boolean;
  /**
   * Kaza (missed-prayer) tracker. Flavor-independent, ships in both. When on,
   * Kaza is a permanent tab: a daily tracker has to be one tap away, and an
   * opt-in pin nothing in the app ever offered left it unreachable.
   */
  islamic: boolean;
};

export type TabDef = {
  name: string;
  label: string;
  icon: 'home' | 'transactions' | 'add' | 'kaza' | 'chits' | 'settings';
};

export const getUserTabs = (flags: ModuleFlags): TabDef[] => {
  const tabs: TabDef[] = [
    { name: 'Home', label: 'Home', icon: 'home' },
    { name: 'Transactions', label: 'Activity', icon: 'transactions' },
    { name: 'Add', label: 'Add', icon: 'add' },
  ];

  if (flags.islamic) {
    tabs.push({ name: 'Kaza', label: 'Kaza', icon: 'kaza' });
  }
  if (flags.chitFund) {
    tabs.push({ name: 'Chits', label: 'Chits', icon: 'chits' });
  }

  tabs.push({ name: 'Settings', label: 'Settings', icon: 'settings' });
  return tabs;
};
