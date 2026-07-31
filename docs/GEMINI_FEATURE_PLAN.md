# CoinKeeper Feature Plan

## Transfers
**Status:** 🔴 missing (No 'transfer' type in `src/types/transaction.ts`)
**Feature design:** Allows users to move money between different internal accounts or wallets without it counting as an expense or income.
**Data model:** Needs a new `type: 'transfer'` added to the `Transaction` interface in `src/types/transaction.ts`. Needs `fromAccountId` and `toAccountId` fields if multi-account is supported. Currently missing.
**UI plan:** Lives on the `AddScreen` (via `AddTransactionSheet`), needs a tab or segment for "Transfer" alongside Income/Expense.
**Implementation steps:**
1. Update `Transaction` type to include `'transfer'` in `src/types/transaction.ts`.
2. Update `AddTransactionSheet` to include a Transfer segment.
3. Update `useTransactions` hook to handle transfer logic (neutral net worth impact).
**Test cases:** Assert that adding a transfer does not change the total net worth or total expense/income metrics.
**Open questions:** Do we support multiple accounts/wallets, or is a transfer just a generic untracked movement?

## Tags
**Status:** 🔴 missing (No tags field in `src/types/transaction.ts`)
**Feature design:** Allows users to apply multiple custom labels to a transaction for flexible grouping and filtering beyond just categories.
**Data model:** Needs a `tags?: string[]` field added to the `Transaction` interface in `src/types/transaction.ts`. Needs a tags table/store if users can manage them globally. Currently missing.
**UI plan:** Lives on `AddTransactionSheet` for input and `TransactionsScreen` for filtering.
**Implementation steps:**
1. Add `tags` field to `Transaction` interface.
2. Add a tag input component to `AddTransactionSheet`.
3. Add tag filtering chips to `TransactionsScreen`.
**Test cases:** Assert that filtering by a tag correctly isolates only transactions containing that tag.
**Open questions:** Should tags be predefined by the user, or created on-the-fly during transaction entry?

## Split Transactions
**Status:** 🔴 missing (No sub-transactions field in `src/types/transaction.ts`)
**Feature design:** Allows a single transaction to be divided into multiple categories or tags (e.g., a supermarket receipt split into Groceries and Electronics).
**Data model:** Needs a `splits?: { amount: number, category: string }[]` field in the `Transaction` interface. Currently missing.
**UI plan:** Lives on `AddTransactionSheet` (allow splitting amount) and `Transaction Detail` (to view splits).
**Implementation steps:**
1. Add `splits` array field to `Transaction` interface.
2. Update `AddTransactionSheet` to support a "Split" mode that validates sub-amounts equal the total amount.
3. Update `TransactionsScreen` and `ReportsScreen` to aggregate based on splits rather than the parent transaction.
**Test cases:** Assert that a split transaction's sub-amounts exactly equal the parent total amount, and that analytics aggregate the splits correctly.
**Open questions:** How deep should splits go? Do we allow tags per split?

## Confidence-Scored Auto-Categorization
**Status:** ⚠️ partial (`src/services/categorizationService.ts` exists but is orphaned)
**Feature design:** Automatically assigns a category to a transaction based on the description or merchant name, assigning a confidence score to flag uncertain matches for user review.
**Data model:** Needs a `confidenceScore?: number` field and `needsReview?: boolean` field on the `Transaction` interface. `categorizationService.ts` contains partial logic.
**UI plan:** Lives on `TransactionsScreen` (showing a badge for transactions needing review) and `SMS Review` screen.
**Implementation steps:**
1. Integrate `categorizationService.ts` into the transaction creation flow (e.g., SMS parsing).
2. Add `needsReview` boolean to transaction type.
3. Add a UI badge in `TransactionsScreen` for items needing review, allowing one-tap confirmation.
**Test cases:** Assert that transactions matched with a low confidence score are flagged with `needsReview = true`.
**Open questions:** What is the threshold score for auto-approval vs requiring user review?

## Local Merchant Memory
**Status:** 🔴 missing (No merchant store or memory logic found)
**Feature design:** Remembers the category previously chosen by the user for a specific merchant, improving future auto-categorization locally without needing cloud data.
**Data model:** Needs a local key-value store (e.g., in SQLite or AsyncStorage) mapping `merchantName -> lastCategory`. Currently missing.
**UI plan:** Invisible feature; improves defaults in `AddTransactionSheet` when typing a merchant name.
**Implementation steps:**
1. Create a `merchantMemoryService` that listens to transaction saves and updates the local mapping.
2. Hook the service into `AddTransactionSheet` to auto-fill the category when the description/merchant matches a known key.
**Test cases:** Assert that saving a transaction for "Starbucks" as "Food" causes the next "Starbucks" entry to default to "Food".
**Open questions:** Should users be able to view and manage these learned merchant rules in Settings?

## Subscription-Detector False-Positive Handling
**Status:** ⚠️ partial (`src/services/subscriptionDetector.ts` exists but is orphaned)
**Feature design:** Detects recurring payments but allows the user to mark false positives so they aren't incorrectly flagged as subscriptions in the future.
**Data model:** Needs a `ignoredSubscriptions?: string[]` table/store to persist false positives. Logic exists in `subscriptionDetector.ts`.
**UI plan:** Lives on `Home / Dashboard` (Upcoming Bills section) or a dedicated `Bills` screen.
**Implementation steps:**
1. Integrate `subscriptionDetector.ts` to scan transactions.
2. Build UI in `Home` to surface detected subscriptions.
3. Add an "Ignore" or "Not a subscription" button that writes the merchant/pattern to an ignore list.
**Test cases:** Assert that marking a detected subscription as a false positive prevents it from appearing in subsequent detection scans.
**Open questions:** How do we handle variable amounts for the same subscription?

## Statement Import (PDF/Excel)
**Status:** 🔴 missing (No import logic for lite app; chit-fund export exists but no import)
**Feature design:** Allows users to bulk-import historical transactions by uploading bank statements in PDF or Excel formats.
**Data model:** No new database fields, but needs a robust parsing engine/service to map external rows to the `Transaction` schema.
**UI plan:** Lives in `SettingsScreen` under a new "Import Data" row.
**Implementation steps:**
1. Add a file picker library to select local documents.
2. Implement a local parsing service (CSV/Excel first, PDF later if viable on-device).
3. Build a review UI to confirm bulk imported rows before committing to SQLite.
**Test cases:** Assert that importing a valid CSV correctly maps dates, amounts, and descriptions, and rejects malformed rows.
**Open questions:** Do we handle PDF parsing locally on-device, or restrict to CSV/Excel for the MVP?

## Forecast Balance
**Status:** 🔴 missing (No forecasting logic found)
**Feature design:** Projects the user's future balance based on current cash on hand minus upcoming detected subscriptions and recurring bills.
**Data model:** Derives data from current balance and detected subscriptions. No new tables needed, just a service function.
**UI plan:** Lives on `Home / Dashboard`, displayed alongside the current balance.
**Implementation steps:**
1. Implement a `forecastService` that calculates `Current Balance - sum(Upcoming Bills)`.
2. Update the balance card on `UserDashboardScreen` to show the safe/forecasted balance.
**Test cases:** Assert that the forecast balance strictly equals the current balance minus the sum of pending bills for the month.
**Open questions:** How far into the future should the forecast project? (e.g., End of month, or next 30 days?)

## Savings Suggestions
**Status:** ⚠️ partial (`src/services/insightsEngine.ts` exists and drives `SmartInsightCard.tsx`)
**Feature design:** Analyzes spending patterns to suggest areas where the user can cut back (e.g., "You spent 20% more on Food this month").
**Data model:** Driven by `insightsEngine.ts` which analyzes the transaction store.
**UI plan:** Lives on `Home / Dashboard` via the `SmartInsightCard`.
**Implementation steps:**
1. Expand `insightsEngine.ts` to include specific saving heuristics (e.g., month-over-month category spikes).
2. Ensure the UI handles actionable suggestions (e.g., tapping the suggestion takes you to the category drill-down).
**Test cases:** Assert that a 20% increase in a category triggers the specific savings suggestion rule.
**Open questions:** Should users be able to dismiss or vote on the helpfulness of suggestions?

## Streaks/Nudges
**Status:** 🔴 missing (No streak tracking logic found)
**Feature design:** Encourages daily app usage and financial mindfulness by tracking consecutive days of logging transactions or staying under budget.
**Data model:** Needs a `lastActiveDate` and `currentStreak` fields in the local preferences store.
**UI plan:** Lives on `Home / Dashboard` as a small header badge or widget.
**Implementation steps:**
1. Add streak counters to `getPreference`/`setPreference`.
2. Update the streak count on app launch or transaction save.
3. Display the streak badge on `UserDashboardScreen`.
**Test cases:** Assert that opening the app on consecutive days increments the streak, and missing a day resets it to zero.
**Open questions:** Is the streak tied to simply opening the app, or explicitly logging an expense?

## Net Worth Module
**Status:** 🔴 missing (Only basic balance tracking exists)
**Feature design:** Tracks total assets (cash, investments, accounts) minus total liabilities (debts, loans) to show an overall financial health score.
**Data model:** Needs new tables for `Accounts` (assets) and `Liabilities` with their respective balances.
**UI plan:** Lives on `Analytics / Reports` as a macro-level view.
**Implementation steps:**
1. Create schema for distinct Accounts and Liabilities.
2. Create an aggregation service to sum net worth.
3. Add a Net Worth trend chart to `ReportsScreen`.
**Test cases:** Assert that adding a liability correctly reduces the total net worth calculation.
**Open questions:** Does this require manual entry for all accounts, or will we eventually support bank syncing?

## Feedback System
**Status:** 🔴 missing (Help Center row exists but is a no-op)
**Feature design:** Allows users to submit bug reports, feature requests, or general feedback directly from the app.
**Data model:** Needs a local form state that ultimately triggers an email intent or an API call.
**UI plan:** Lives in `SettingsScreen` -> `Help Center` or `Feedback`.
**Implementation steps:**
1. Wire the existing inert `Help Center` row in `SettingsScreen`.
2. Build a simple text-area form screen.
3. Implement a submission handler (e.g., `Linking.openURL('mailto:...')` for local-first).
**Test cases:** Assert that submitting the form successfully formats the payload with app version and device info.
**Open questions:** Since the lite app is local-first, is feedback sent via native email intent or a lightweight anonymous API?

## Role-Based Access
**Status:** ✅ built (`PermissionsRolesScreen.tsx` exists and is wired in `chitFundRoutes.ts`)
**Feature design:** Restricts certain actions (e.g., approving payments, modifying draws) to group admins or specific roles.
**Data model:** Roles and permissions are handled within the existing Firebase/Firestore backend for the `pro` flavor.
**UI plan:** Lives in the Admin console (`PermissionsRolesScreen`).
**Implementation steps:**
1. Verify role gates on sensitive UI actions (already largely implemented in the chit-fund module).
**Test cases:** Assert that a standard user cannot access or trigger admin-only API routes or UI buttons.
**Open questions:** None; feature is built for the private flavor.

## Audit-Safe Local Settings
**Status:** ✅ built (`AuditLogScreen.tsx` exists and is wired in `chitFundRoutes.ts`)
**Feature design:** Keeps an immutable log of critical settings changes or administrative actions for transparency and dispute resolution.
**Data model:** Handled in the backend for the `pro` flavor; local settings for `lite` are currently just preferences.
**UI plan:** Lives in the Admin console (`AuditLogScreen`).
**Implementation steps:**
1. Ensure all critical state mutations write an append-only log entry.
**Test cases:** Assert that modifying a group rule writes exactly one corresponding record to the audit log.
**Open questions:** Should the local-first `lite` version also maintain a local SQLite audit log for personal accountability?
