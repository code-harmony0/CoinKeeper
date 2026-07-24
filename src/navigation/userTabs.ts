export type TabDef = { name: string; label: string; icon: 'home' | 'transactions' | 'add' | 'kaza' | 'settings' };

export const getUserTabs = (chitFundEnabled: boolean): TabDef[] => {
  const tabs: TabDef[] = [
    { name: 'Home', label: 'Home', icon: 'home' },
    { name: 'Transactions', label: 'Activity', icon: 'transactions' },
    { name: 'Add', label: 'Add', icon: 'add' },
  ];
  if (chitFundEnabled) {
    tabs.push({ name: 'Kaza', label: 'Kaza', icon: 'kaza' });
  }
  tabs.push({ name: 'Settings', label: 'Settings', icon: 'settings' });
  return tabs;
};
