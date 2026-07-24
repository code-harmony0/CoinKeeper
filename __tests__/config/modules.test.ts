jest.mock('react-native-config', () => ({ APP_VARIANT: 'public' }));

import { isModuleEnabled } from '../../src/config/modules';

describe('modules', () => {
  it('always enables finance', () => {
    expect(isModuleEnabled('finance')).toBe(true);
  });

  it('disables chitFund on the public variant', () => {
    expect(isModuleEnabled('chitFund')).toBe(false);
  });
});

describe('modules — private variant', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native-config', () => ({ APP_VARIANT: 'private' }));
  });

  it('enables chitFund on the private variant', () => {
    const { isModuleEnabled } = require('../../src/config/modules');
    expect(isModuleEnabled('chitFund')).toBe(true);
  });
});
