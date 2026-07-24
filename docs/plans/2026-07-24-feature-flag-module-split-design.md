# Feature-flag / build-variant foundation — design

## Goal
Ship one codebase with two outputs: a public Play Store build (Finance Tracker only) and a private/internal build (Finance Tracker + Chit Fund). Chit-fund screens must be unreachable in the public build — no route, no button, no admin login path — not just hidden behind a UI toggle.

## Scope
Build-time variant only. No runtime/remote flag overrides in this pass (Firebase Remote Config per-user/beta-group control is deferred to a later, separate module).

## Module split (current codebase)

**chitFund module:**
- `AdminTabNavigator` (Dashboard/Groups/Approvals/Settings) and everything under it
- Stacks: `GroupsStackNavigator`, `MembersStackNavigator`, `CollectionsStackNavigator`, `DrawsStackNavigator`, `PaymentConfirmationsStackNavigator`, `AnalyticsStackNavigator`
- Screens: `AuditLogScreen`, `PermissionsRolesScreen`
- User-side: `GroupsScreen`, `ChitDetailScreen`, `KazaScreen` (the `Kaza` tab in `UserTabNavigator`)

**finance module (always on):**
- `UserDashboardScreen`, `TransactionsScreen`, `AddScreen`, `AskAiScreen`, `ReportsScreen`, `SettingsScreen`
- `NotificationsStackNavigator` (reused for bill/reminder notifications)

## Architecture

1. **Build-time variant** — add `react-native-config`. Two env files, `.env.public` / `.env.private`, each setting `APP_VARIANT=public|private`. Build scripts copy the right file to `.env` before build (`npm run android:public`, `android:private`).

2. **Module registry** — `src/config/modules.ts`:
   ```ts
   export type ModuleId = 'finance' | 'chitFund';
   export const ENABLED_MODULES: Record<ModuleId, boolean> = {
     finance: true,
     chitFund: Config.APP_VARIANT === 'private',
   };
   export const isModuleEnabled = (id: ModuleId) => ENABLED_MODULES[id];
   ```
   Single source of truth — nothing else re-derives the variant check.

3. **Navigation gating** — `RootNavigator` conditionally registers the chit-fund-only screens/stacks only if `isModuleEnabled('chitFund')`. `UserTabNavigator`'s tab list drops `Kaza` when disabled (4 tabs instead of 5). Imports are still bundled by Metro in this pass (no native flavor split) — the routes are simply unreachable.

4. **Login/role flow** — public build's login always lands on `UserTabs`; there is no path that routes into `AdminTabs`.

## Out of scope (deferred)
- Native Android product flavors / iOS schemes to physically strip chit-fund source from the compiled bundle.
- Firebase Remote Config runtime overrides for per-user/beta/plan-based module control.
