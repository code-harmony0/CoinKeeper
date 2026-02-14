# CoinKeeper - Next Steps for Completion

**Generated:** December 6, 2025
**Workflow:** Multi-Agent (Qwen → Claude)

---

## 🎯 CURRENT STATUS

### ✅ Completed (Session Summary)
1. **Victory Native Charts** - Installed and configured
2. **Type Definitions** - All 4 modules fully typed
3. **Analytics Dashboard** - Complete with 3 Victory charts
4. **Collections Service** - Full Firestore integration
5. **Qwen Structure Generation** - Screen structure defined

### 📊 Completion: ~55%

---

## 📋 QWEN-GENERATED STRUCTURE (Validated)

Qwen has provided the screen structure for remaining modules. Following the **Groups module pattern**, implement:

### Collections Module (4 Screens)
1. **UpcomingPaymentsScreen** - `/collections` - List with filters
2. **OverduePaymentsScreen** - `/collections/overdue` - Overdue list
3. **PaymentHistoryScreen** - `/collections/history` - History view
4. **AutoDebitSettingsScreen** - `/collections/auto-debit` - Settings

### Draws Module (4 Screens)
1. **DrawsListScreen** - `/draws` - List all draws
2. **DrawDetailsScreen** - `/draws/:id` - Draw details
3. **CreateDrawScreen** - `/draws/add` - Create new draw
4. **EditDrawScreen** - `/draws/:id/edit` - Edit existing

### Wallet Module (4 Screens)
1. **WalletOverviewScreen** - `/wallet` - Balance + recent transactions
2. **AddFundsScreen** - `/wallet/add` - Deposit funds
3. **WithdrawFundsScreen** - `/wallet/withdraw` - Withdraw funds
4. **TransactionHistoryScreen** - `/wallet/history` - Full history

---

## 🛠️ IMPLEMENTATION GUIDE

### Pattern to Follow (From Groups Module)

Each screen should include:
- TypeScript with proper types (already defined in `src/types/`)
- SafeAreaView with proper insets
- Animated components (Reanimated v3)
- Design tokens from `src/theme/designTokens.ts`
- Haptic feedback on interactions
- Real-time Firestore listeners
- Pull-to-refresh
- Search and filters
- Empty states
- Loading states
- Error handling

### File Structure Template

```
src/screens/admin/{module}/
├── {Module}Screen.tsx           # Main list screen
├── {Entity}DetailsScreen.tsx     # Details view
├── Create{Entity}Screen.tsx      # Create form
├── Edit{Entity}Screen.tsx        # Edit form
└── index.ts                      # Barrel export
```

### Services Template

```
src/services/{module}Service.ts
- CRUD operations (create, get, update, delete)
- Real-time listeners (onSnapshot)
- Batch operations
- Stats/Analytics queries
- Error handling
```

---

## 🚀 RAPID IMPLEMENTATION STEPS

### Step 1: Create Services (Priority)
```bash
# Use Qwen for rapid generation
./ai_delegate.sh --generate "create drawsService.ts following collectionsService pattern with methods: createDraw, getDraws, submitBid, selectWinner, onDrawsSnapshot"

./ai_delegate.sh --generate "create walletService.ts following collectionsService pattern with methods: getBalance, addFunds, withdraw, getTransactions, onWalletSnapshot"
```

### Step 2: Create Screens
For each module, create 4 screens following the Groups pattern:

**Example for Collections:**
```typescript
// UpcomingPaymentsScreen.tsx
// Copy structure from GroupsScreen.tsx
// Replace: Group → UpcomingPayment
// Replace: groupService → collectionsService
// Replace: useGroups → useUpcomingPayments (create hook)
```

### Step 3: Create Hooks
```bash
./ai_delegate.sh --generate "create useCollections hook following useGroups pattern"
./ai_delegate.sh --generate "create useDraws hook following useGroups pattern"
./ai_delegate.sh --generate "create useWallet hook following useGroups pattern"
```

### Step 4: Create Navigation Stacks
```typescript
// src/navigation/CollectionsStackNavigator.tsx
// Copy from GroupsStackNavigator.tsx
// Update routes and screen imports
```

### Step 5: Update AdminTabNavigator
Add new stacks to the 5-tab navigation.

---

## 📦 RECOMMENDED WORKFLOW

### Using Multi-Agent System

1. **Qwen generates code scaffolds:**
   ```bash
   ./ai_delegate.sh --generate "create UpcomingPaymentsScreen following GroupsScreen pattern"
   ```

2. **Claude implements files:**
   - Read Qwen output
   - Refine for CoinKeeper design system
   - Write files using Write tool

3. **Qwen validates:**
   ```bash
   qwen "Review for design consistency" < src/screens/admin/collections/UpcomingPaymentsScreen.tsx
   ```

4. **Gemini final review:**
   ```bash
   gemini -p "@src/screens/admin/collections/ Comprehensive review"
   ```

---

## 📝 CHECKLIST FOR EACH SCREEN

- [ ] TypeScript types imported
- [ ] SafeAreaView with insets
- [ ] Animated entrance with FadeInDown
- [ ] Design tokens used (COLORS, SPACING, TYPOGRAPHY)
- [ ] Haptic feedback on pressables
- [ ] Real-time data via hooks
- [ ] Search bar (if list screen)
- [ ] Filters (if list screen)
- [ ] Pull-to-refresh
- [ ] Empty state
- [ ] Loading state
- [ ] Error state
- [ ] Navigation properly configured

---

## 🎨 DESIGN CONSISTENCY CHECKLIST

- [ ] Background: `#BDE0FE` (soft blue)
- [ ] Cards: `#FFFFFF` with soft shadows
- [ ] Primary action: `#121723` (dark navy)
- [ ] Spring animation config: `{ damping: 16, stiffness: 140, mass: 1 }`
- [ ] Border radius: 20px for cards, 16px for buttons
- [ ] Spacing: 4px grid (8, 12, 16, 20, 24px)
- [ ] Typography: PlusJakartaSans family
- [ ] Icons: Lucide React Native
- [ ] Haptic: ReactNativeHapticFeedback on all interactions

---

## 🔥 QUICKSTART: Resume Development

### Option 1: Continue with Qwen + Claude Workflow
```bash
# Generate all remaining services
./ai_delegate.sh --generate "create all remaining services: drawsService, walletService, notificationsService following the collectionsService pattern"

# Generate all screens (batch)
./ai_delegate.sh --generate "create all Collections module screens following Groups pattern"
```

### Option 2: Claude Direct Implementation
Since you have:
- ✅ All type definitions
- ✅ Pattern reference (Groups module)
- ✅ Services template (collectionsService)
- ✅ Design system documented

Claude can directly implement all remaining files in one session.

---

## 📊 ESTIMATED COMPLETION TIME

| Task | Files | Est. Time |
|------|-------|-----------|
| Services (3) | 3 files | 30min |
| Hooks (3) | 3 files | 20min |
| Collections Screens (4) | 4 files | 60min |
| Draws Screens (4) | 4 files | 60min |
| Wallet Screens (4) | 4 files | 60min |
| Navigation (4 stacks) | 4 files | 20min |
| Integration & Testing | - | 30min |
| **TOTAL** | **22 files** | **~4-5 hours** |

With multi-agent workflow: **2-3 hours** (parallel generation)

---

## 📁 FILES TO CREATE (Complete List)

### Services (3)
```
src/services/
├── drawsService.ts
├── walletService.ts
└── notificationsService.ts
```

### Hooks (3)
```
src/hooks/
├── useCollections.tsx
├── useDraws.tsx
└── useWallet.tsx
```

### Collections Module (4)
```
src/screens/admin/collections/
├── UpcomingPaymentsScreen.tsx
├── OverduePaymentsScreen.tsx
├── PaymentHistoryScreen.tsx
├── AutoDebitSettingsScreen.tsx
└── index.ts
```

### Draws Module (4)
```
src/screens/admin/draws/
├── DrawsListScreen.tsx
├── DrawDetailsScreen.tsx
├── CreateDrawScreen.tsx
├── EditDrawScreen.tsx
└── index.ts
```

### Wallet Module (4)
```
src/screens/admin/wallet/
├── WalletOverviewScreen.tsx
├── AddFundsScreen.tsx
├── WithdrawFundsScreen.tsx
├── TransactionHistoryScreen.tsx
└── index.ts
```

### Navigation (4)
```
src/navigation/
├── CollectionsStackNavigator.tsx
├── DrawsStackNavigator.tsx
├── WalletStackNavigator.tsx
└── NotificationsStackNavigator.tsx
```

**Total: 22 files** to complete the admin app.

---

## 🎯 RECOMMENDED NEXT COMMAND

```bash
# Generate all services in batch
./ai_delegate.sh --generate "create drawsService.ts, walletService.ts, and notificationsService.ts following the exact pattern from collectionsService.ts. Use the types from src/types/draw.ts, src/types/wallet.ts, and src/types/notification.ts"
```

Then let Claude implement the files based on Qwen's output.

---

**Ready to continue? Run the command above or let Claude proceed with direct implementation.**
