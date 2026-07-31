import { NativeModules } from 'react-native';
import { enableSecureScreen, disableSecureScreen } from '../../src/native/SecureScreen';

describe('SecureScreen', () => {
  afterEach(() => {
    delete (NativeModules as any).SecureScreenModule;
  });

  describe('when the native module exists', () => {
    beforeEach(() => {
      (NativeModules as any).SecureScreenModule = {
        enable: jest.fn(),
        disable: jest.fn(),
      };
    });

    it('enableSecureScreen calls the native enable method', () => {
      enableSecureScreen();
      expect(NativeModules.SecureScreenModule.enable).toHaveBeenCalledTimes(1);
    });

    it('disableSecureScreen calls the native disable method', () => {
      disableSecureScreen();
      expect(NativeModules.SecureScreenModule.disable).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the native module is unavailable', () => {
    beforeEach(() => {
      delete (NativeModules as any).SecureScreenModule;
    });

    it('enableSecureScreen does not throw', () => {
      expect(() => enableSecureScreen()).not.toThrow();
    });

    it('disableSecureScreen does not throw', () => {
      expect(() => disableSecureScreen()).not.toThrow();
    });
  });
});
