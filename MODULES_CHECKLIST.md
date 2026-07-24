# CoinKeeper Modules Checklist & Roadmap

This file is designed to track, elaborate on, and systematically improve each module in the CoinKeeper app. You can use the checkboxes to track progress as we iterate on each feature.

---

## 🛡️ Admin Modules

### 1. Analytics & Reporting
- [ ] **Analytics Dashboard (`AnalyticsDashboardScreen`)**
  - *Current State:* Overview of pooled change, groups change, overdue payments, and collection rates.
  - *Improvements/Ideas:* Add more visual charts (Skia), better date range filters, predictive insights.
- [ ] **Group Analytics (`GroupAnalyticsScreen`)**
  - *Current State:* Deep dive into specific group metrics.
  - *Improvements/Ideas:* 
- [ ] **Member Analytics (`MemberAnalyticsScreen`)**
  - *Current State:* Tracks member payment behaviors and reliability.
  - *Improvements/Ideas:* Add a "trust score" or automated flagging for high-risk members.
- [ ] **System Health (`SystemHealthScreen`)**
  - *Current State:* Monitors platform stability.
  - *Improvements/Ideas:* 
- [ ] **Data Export (`ExportDataScreen`)**
  - *Current State:* Exports data (PDFs/CSVs).
  - *Improvements/Ideas:* 

### 2. Groups Management
- [ ] **Group Listing & Details (`GroupsScreen`, `GroupDetailsScreen`)**
  - *Current State:* View active groups, pool sizes, and members.
  - *Improvements/Ideas:* 
- [ ] **Group Creation/Editing (`CreateGroupScreen`, `EditGroupScreen`)**
  - *Current State:* Setup saving groups and rules.
  - *Improvements/Ideas:* 

### 3. Draws (Chit Funds) Management
- [ ] **Draws Lifecycle (`DrawsListScreen`, `CreateDrawScreen`, `EditDrawScreen`)**
  - *Current State:* Schedule and manage upcoming chit draws.
  - *Improvements/Ideas:* 
- [ ] **Draw Execution (`DrawDetailsScreen`)**
  - *Current State:* Details of who won the pot and distribution logistics.
  - *Improvements/Ideas:* Add automated randomized selection animations for transparency.

### 4. Members Management
- [ ] **Member Directory & Details (`MembersScreen`, `MemberDetailsScreen`)**
  - *Current State:* List of members and their deep-dive profiles.
  - *Improvements/Ideas:* 
- [ ] **Member Onboarding (`AddMemberScreen`)**
  - *Current State:* Form to add a new member.
  - *Improvements/Ideas:* Batch import from contacts or CSV.

### 5. Collections & Payments (Accounts Receivable)
- [ ] **Payment Tracking (`UpcomingPaymentsScreen`, `OverduePaymentsScreen`, `PaymentHistoryScreen`)**
  - *Current State:* Ledger of upcoming, late, and completed payments.
  - *Improvements/Ideas:* Automated WhatsApp/SMS reminders for overdue payments.
- [ ] **Payment Confirmations (`PendingConfirmationsScreen`, `ConfirmationDetailScreen`)**
  - *Current State:* Admin reviews and approves/rejects user payment proofs.
  - *Improvements/Ideas:* 
- [ ] **Receipts (`ReceiptScreen`)**
  - *Current State:* Generating and managing transaction receipts.
  - *Improvements/Ideas:* 

### 6. System Settings & Security
- [ ] **Approvals (`AdminApprovalsScreen`)**
  - *Current State:* Global approvals.
  - *Improvements/Ideas:* 
- [ ] **Roles & Audit (`PermissionsRolesScreen`, `AuditLogScreen`)**
  - *Current State:* RBAC management and immutable logging.
  - *Improvements/Ideas:* 
- [ ] **Admin Settings (`AdminSettingsScreen`)**
  - *Current State:* Global admin configurations.
  - *Improvements/Ideas:* 

---

## 👤 User Modules

### 1. Dashboard & Home
- [ ] **User Dashboard (`UserDashboardScreen`, `HomeScreen`)**
  - *Current State:* Balances, active chits, next contributions due.
  - *Improvements/Ideas:* Add more gamification (streaks for on-time payments).

### 2. Group & Chit Management
- [ ] **User Groups Directory (`GroupsScreen`)**
  - *Current State:* Shows groups the user is part of.
  - *Improvements/Ideas:* 
- [ ] **Chit Details (`ChitDetailScreen`)**
  - *Current State:* Shows pot size, duration, past winners.
  - *Improvements/Ideas:* 

### 3. Financial Tracking
- [ ] **Personal Ledger (`TransactionsScreen`, `ReportsScreen`)**
  - *Current State:* Transaction history and personal financial summaries.
  - *Improvements/Ideas:* Expand reporting to show long-term wealth growth.
- [ ] **Add Transaction (`AddScreen`)**
  - *Current State:* Quick-add for logging payments/receipts.
  - *Improvements/Ideas:* 
- [ ] **Kaza Module (`KazaScreen`)**
  - *Current State:* Specialized internal ledger/market functions.
  - *Improvements/Ideas:* 

### 4. Utilities
- [ ] **Notifications (`NotificationsScreen`)**
  - *Current State:* Alerts for payments, receipts, and draw results.
  - *Improvements/Ideas:* Push notification integration via FCM.
- [ ] **Settings & Profile (`SettingsScreen`, `ProfileScreen`)**
  - *Current State:* User profile and app preferences.
  - *Improvements/Ideas:* Add biometric authentication (FaceID/TouchID) for extra security.

---

*Tip: When you are ready to work on a specific module, just reference its section here, and we can discuss architecture, UX/UI improvements, and implementation details before checking it off!*
