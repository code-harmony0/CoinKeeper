import { getUserTabs } from '../../src/navigation/userTabs';

describe('getUserTabs', () => {
  it('does not spend a tab slot on Kaza by default', () => {
    const names = getUserTabs({ chitFund: false, islamic: true, kazaPinned: false }).map(t => t.name);
    expect(names).toEqual(['Home', 'Transactions', 'Add', 'Settings']);
  });

  it('pins Kaza as a tab only when the user opted in', () => {
    const names = getUserTabs({ chitFund: false, islamic: true, kazaPinned: true }).map(t => t.name);
    expect(names).toContain('Kaza');
  });

  it('never pins Kaza when the islamic module is off', () => {
    const names = getUserTabs({ chitFund: false, islamic: false, kazaPinned: true }).map(t => t.name);
    expect(names).not.toContain('Kaza');
  });

  it('adds Chits only when the chit fund module is enabled', () => {
    const off = getUserTabs({ chitFund: false, islamic: true, kazaPinned: false }).map(t => t.name);
    const on = getUserTabs({ chitFund: true, islamic: true, kazaPinned: false }).map(t => t.name);
    expect(off).not.toContain('Chits');
    expect(on).toContain('Chits');
  });

  it('always starts with Home and ends with Settings', () => {
    const combos = [
      { chitFund: false, islamic: false, kazaPinned: false },
      { chitFund: true, islamic: true, kazaPinned: true },
    ];
    combos.forEach(flags => {
      const names = getUserTabs(flags).map(t => t.name);
      expect(names[0]).toBe('Home');
      expect(names[names.length - 1]).toBe('Settings');
    });
  });
});
