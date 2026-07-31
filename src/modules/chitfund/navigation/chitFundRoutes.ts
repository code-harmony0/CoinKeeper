/**
 * Every chit-fund route in one manifest.
 *
 * RootNavigator reaches this through a single CHITFUND_ENABLED-guarded
 * require(), so the lite bundle resolves none of these modules. Adding a
 * chit-fund screen means adding it here — never importing it from
 * src/navigation directly, which would drag the module into the lite bundle.
 */
import type { ComponentType } from 'react';

import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '../screens/auth';
import { GroupsScreen } from '../screens/GroupsScreen';
import { ChitDetailScreen } from '../screens/ChitDetailScreen';
import { AdminTabNavigator } from './AdminTabNavigator';
import { MembersStackNavigator } from './MembersStackNavigator';
import { TransactionsStackNavigator } from './TransactionsStackNavigator';
import { CollectionsStackNavigator } from './CollectionsStackNavigator';
import { DrawsStackNavigator } from './DrawsStackNavigator';
import { PaymentConfirmationsStackNavigator } from './PaymentConfirmationsStackNavigator';
import { AnalyticsStackNavigator } from './AnalyticsStackNavigator';
import { NotificationsStackNavigator } from './NotificationsStackNavigator';
import { AuditLogScreen } from '../screens/admin/settings/AuditLogScreen';
import { PermissionsRolesScreen } from '../screens/admin/settings/PermissionsRolesScreen';

export type RouteDef = { name: string; component: ComponentType<any> };

export const chitFundRoutes: RouteDef[] = [
  { name: 'Login', component: LoginScreen },
  // LoginForm navigates to both of these. They were built but never
  // registered, so the sign-up and password-recovery paths dead-ended.
  { name: 'Register', component: RegisterScreen },
  { name: 'ForgotPassword', component: ForgotPasswordScreen },
  { name: 'Groups', component: GroupsScreen },
  { name: 'ChitDetail', component: ChitDetailScreen },
  { name: 'AdminTabs', component: AdminTabNavigator },
  { name: 'MembersStack', component: MembersStackNavigator },
  { name: 'TransactionsStack', component: TransactionsStackNavigator },
  { name: 'Collections', component: CollectionsStackNavigator },
  { name: 'Draws', component: DrawsStackNavigator },
  { name: 'PaymentConfirmations', component: PaymentConfirmationsStackNavigator },
  { name: 'Analytics', component: AnalyticsStackNavigator },
  { name: 'AuditLog', component: AuditLogScreen },
  { name: 'PermissionsRoles', component: PermissionsRolesScreen },
  // Currently an admin-only notifications stack. Phase 4 adds a local
  // bills/budget notifications screen for the lite build.
  { name: 'Notifications', component: NotificationsStackNavigator },
];
