import Config from 'react-native-config';

export type ModuleId = 'finance' | 'chitFund';

export const ENABLED_MODULES: Record<ModuleId, boolean> = {
  finance: true,
  chitFund: Config.APP_VARIANT === 'private',
};

export const isModuleEnabled = (id: ModuleId): boolean => ENABLED_MODULES[id];
