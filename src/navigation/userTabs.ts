export type ModuleFlags = {
  /** Chit fund module — pro flavor only. */
  chitFund: boolean;
  /** Kaza (missed-prayer) tracker. Flavor-independent, ships in both. */
  islamic: boolean;
  /**
   * Whether the user promoted Kaza to a tab. Reads from the `preferences`
   * table, default false — Kaza is always reachable from Settings when the
   * islamic module is on, but it does not take a tab slot unless asked for.
   */
  kazaPinned: boolean;
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

  if (flags.islamic && flags.kazaPinned) {
    tabs.push({ name: 'Kaza', label: 'Kaza', icon: 'kaza' });
  }
  if (flags.chitFund) {
    tabs.push({ name: 'Chits', label: 'Chits', icon: 'chits' });
  }

  tabs.push({ name: 'Settings', label: 'Settings', icon: 'settings' });
  return tabs;
};
