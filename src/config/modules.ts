import { NativeModules } from 'react-native';

const { BuildConfig } = NativeModules;

export type ModuleId = 'finance' | 'chitFund';

export const ENABLED_MODULES: Record<ModuleId, boolean> = {
  finance: true,
  chitFund: BuildConfig ? BuildConfig.INCLUDE_CHITFUND : false,
};

export const isModuleEnabled = (id: ModuleId): boolean => ENABLED_MODULES[id];
