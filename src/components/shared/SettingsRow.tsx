/**
 * Shared Settings UI — the ONE settings-row/card/logout-button/primary-button
 * implementation for both admin and user sides. Extracted directly from
 * AdminSettingsScreen so the two screens can't drift apart again. See
 * src/theme/settingsIcons.ts for the exact tint/logout color source.
 *
 * No screen should hand-roll a settings row, icon box, card, divider,
 * section title, logout button, or primary CTA button — every shape needed
 * by both AdminSettingsScreen and (user) SettingsScreen lives here.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { LucideIcon, ChevronRight, LogOut } from 'lucide-react-native';
import { PressableScale } from '../anim';
import { useSpecTheme } from '../../theme/specTheme';
import {
  SETTINGS_TINTS,
  SettingsTintName,
  LOGOUT_COLORS,
  ICON_CONTAINER_SIZE,
  ICON_CONTAINER_RADIUS,
  SETTINGS_CARD_SHADOW,
} from '../../theme/settingsIcons';

// ---- Card wrapper ---------------------------------------------------

export const SettingsCard: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  const { colors } = useSpecTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card },
        SETTINGS_CARD_SHADOW,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const SettingsDivider: React.FC = () => {
  const { colors } = useSpecTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.surfaceSunken }]} />
  );
};

export const SettingsSectionTitle: React.FC<{ children: string }> = ({
  children,
}) => {
  const { colors } = useSpecTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
      {children}
    </Text>
  );
};

// ---- Icon box (standalone — for rows AND custom layouts like a profile avatar) ----

export const SettingsIconBox: React.FC<{
  icon: LucideIcon;
  tint: SettingsTintName;
  size?: number;
}> = ({ icon: Icon, tint, size = ICON_CONTAINER_SIZE }) => {
  const { isDark } = useSpecTheme();
  const pair = SETTINGS_TINTS[tint][isDark ? 'dark' : 'light'];
  const iconSize = Math.round(size * 0.5);
  return (
    <View
      style={[
        styles.iconBox,
        {
          width: size,
          height: size,
          borderRadius: (size / ICON_CONTAINER_SIZE) * ICON_CONTAINER_RADIUS,
          backgroundColor: pair.bg,
        },
      ]}
    >
      <Icon size={iconSize} color={pair.icon} strokeWidth={2.5} />
    </View>
  );
};

// ---- Row --------------------------------------------------------------

interface SettingsRowProps {
  icon: LucideIcon;
  tint: SettingsTintName;
  label: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode; // e.g. a Switch — takes priority over the chevron
  showChevron?: boolean;
  children?: React.ReactNode; // custom content under the label/description (e.g. a TextInput)
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  tint,
  label,
  description,
  onPress,
  rightElement,
  showChevron = true,
  children,
}) => {
  const { colors } = useSpecTheme();

  const content = (
    <View style={styles.row}>
      <SettingsIconBox icon={Icon} tint={tint} />
      <View style={styles.rowContent}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        ) : null}
        {children}
      </View>
      {rightElement ??
        (showChevron && onPress ? (
          <ChevronRight size={20} color={colors.textSecondary} />
        ) : null)}
    </View>
  );

  if (!onPress) {
    return content;
  }
  return (
    <PressableScale
      onPress={onPress}
      haptic="impactLight"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </PressableScale>
  );
};

// ---- Logout button ------------------------------------------------------

export const LogoutButton: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => {
  const { isDark } = useSpecTheme();
  const c = isDark ? LOGOUT_COLORS.dark : LOGOUT_COLORS.light;

  return (
    <PressableScale
      onPress={onPress}
      haptic="impactLight"
      accessibilityRole="button"
      accessibilityLabel="Log Out"
      style={[styles.logoutButton, { backgroundColor: c.bg }]}
    >
      <LogOut size={20} color={c.text} strokeWidth={2.5} />
      <Text style={[styles.logoutText, { color: c.text }]}>Log Out</Text>
    </PressableScale>
  );
};

// ---- Primary CTA button (the black "Save Changes"-style button) ------------

interface SettingsPrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
}

export const SettingsPrimaryButton: React.FC<SettingsPrimaryButtonProps> = ({
  label,
  onPress,
  icon: Icon,
  loading = false,
  disabled = false,
}) => {
  const { colors } = useSpecTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="impactLight"
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.primaryButton,
        { backgroundColor: colors.primaryAccent, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.background} />
      ) : (
        <>
          {Icon ? (
            <Icon size={20} color={colors.background} strokeWidth={2.5} />
          ) : null}
          <Text
            style={[styles.primaryButtonText, { color: colors.background }]}
          >
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 4,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Satoshi-Bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  label: { fontSize: 15, fontFamily: 'Satoshi-Bold' },
  description: { fontSize: 13, fontFamily: 'Satoshi-Regular', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 10,
  },
  logoutText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 10,
  },
  primaryButtonText: { fontSize: 16, fontFamily: 'Satoshi-Bold' },
});
