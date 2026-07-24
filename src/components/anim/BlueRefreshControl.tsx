import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';

export interface BlueRefreshControlProps
  extends Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> {
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Theme-tinted RefreshControl.
 *
 * IMPORTANT: ScrollView clones its `refreshControl` element and injects the
 * entire scroll content as `children`, plus layout `style`. All props —
 * especially `children` — MUST be forwarded to RefreshControl, otherwise the
 * whole screen content is silently swallowed.
 */
export const BlueRefreshControl: React.FC<BlueRefreshControlProps> = ({
  refreshing,
  onRefresh,
  children,
  ...rest
}) => {
  const { colors } = useSpecTheme();

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primaryAccent}
      colors={[colors.primaryAccent]}
      progressBackgroundColor={colors.card}
      {...rest}
    >
      {children}
    </RefreshControl>
  );
};

export default BlueRefreshControl;
