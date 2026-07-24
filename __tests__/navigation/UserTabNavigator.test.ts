import { getUserTabs } from '../../src/navigation/userTabs';

describe('getUserTabs', () => {
  it('includes Kaza when chitFund is enabled', () => {
    const tabs = getUserTabs(true);
    expect(tabs.map(t => t.name)).toContain('Kaza');
    expect(tabs).toHaveLength(5);
  });

  it('excludes Kaza when chitFund is disabled', () => {
    const tabs = getUserTabs(false);
    expect(tabs.map(t => t.name)).not.toContain('Kaza');
    expect(tabs).toHaveLength(4);
  });
});
