import { getUserTabs } from '../../src/navigation/userTabs';

describe('getUserTabs', () => {
  it('gives Kaza a permanent tab beside Settings when the islamic module is on', () => {
    const names = getUserTabs({ chitFund: false, islamic: true }).map(t => t.name);
    expect(names).toEqual(['Home', 'Transactions', 'Add', 'Kaza', 'Settings']);
  });

  it('keeps the Add button in the middle of the bar', () => {
    const names = getUserTabs({ chitFund: false, islamic: true }).map(t => t.name);
    expect(names.indexOf('Add')).toBe(2);
  });

  it('has no Kaza tab when the islamic module is off', () => {
    const names = getUserTabs({ chitFund: false, islamic: false }).map(t => t.name);
    expect(names).not.toContain('Kaza');
  });

  it('adds Chits only when the chit fund module is enabled', () => {
    const off = getUserTabs({ chitFund: false, islamic: true }).map(t => t.name);
    const on = getUserTabs({ chitFund: true, islamic: true }).map(t => t.name);
    expect(off).not.toContain('Chits');
    expect(on).toContain('Chits');
  });

  it('always starts with Home and ends with Settings', () => {
    [
      { chitFund: false, islamic: false },
      { chitFund: true, islamic: true },
    ].forEach(flags => {
      const names = getUserTabs(flags).map(t => t.name);
      expect(names[0]).toBe('Home');
      expect(names[names.length - 1]).toBe('Settings');
    });
  });
});
