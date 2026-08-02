# Add Transaction Sheet — Premium Financial Intake (Design)

Date: 2026-08-02

## Context

`AddTransactionSheet.tsx` is the consumer-facing "Add Transaction" modal (lite app),
distinct from the pro/chit-fund `AddTransactionScreen.tsx`. Most of the required
architecture already exists: `TransactionEntryShell`, `TransactionEntryModeTabs`,
`TransactionPreviewCard`, `StickySaveBar`, `ReceiptPreviewCard`, `SmsInboxRow`, and
four intelligence services (`TransactionDraftService`, `MerchantLearningService`,
`TransactionPredictionService`, `ReceiptScanService`). The gaps are wiring and
information architecture, not missing infrastructure:

- 4th tab "Recent" has no handler and renders nothing.
- SMS tab renders an empty `TransactionPreviewCard` — the real SMS pipeline
  (`SmsModule` → `smsParserService` → `SmsInboxRow`) exists only in the separate,
  unrelated `SmsReviewScreen`.
- Scan mode never shows `ReceiptPreviewCard` (the captured receipt image).
- `AiAssistantCard` (manual-mode prediction) and `TransactionPreviewCard`
  (SMS/scan prediction) duplicate the confidence/budget/duplicate UI.
- `is_recurring_candidate` exists on `TransactionDraft` and is checked by
  `EcosystemIntegrationService`, but nothing in the UI surfaces it.

## Decisions

1. **3 mode tabs**: Manual / SMS / Scan. Drop the dead "Recent" tab; recent +
   favorite merchants fold into a single `SmartSuggestionsSection` inside Manual
   mode instead of being a separate mode.
2. **SMS mode embeds a live inbox** inside the sheet (reusing `fetchRecentSms` /
   `parseSmsToDraft` / `SmsInboxRow`), capped to the 5 most recent messages.
   `SmsReviewScreen` remains for bulk triage, linked via "Review all" when there
   are more than 5.
3. **Full pass**, not phased: wire all 3 modes, unify the prediction UI, add
   receipt image preview to scan mode, motion/empty/loading states.

## Architecture

Keep shell/tabs/save-bar structure as-is. Changes:

- **Unify prediction UI**: merge `AiAssistantCard` → `PredictionBanner`, used in
  all 3 modes. Manual shows category + budget; SMS/scan add confidence +
  duplicate + recurring-candidate. Remove the duplicate confidence/duplicate
  footer currently inside `TransactionPreviewCard`.
- **`SmartSuggestionsSection`** replaces `TimelineSuggestions`: composed of
  `QuickAmountRow` (last 4 distinct amounts), `RecentMerchantRow`, and
  favorites. Manual mode only, shown when amount is empty.
- **SMS mode**: embedded `SmsInboxRow` list (top 5 by recency). Tapping a row
  hydrates the shared `draft` state; `PredictionBanner` + editable fields render
  below it, same Save flow as manual.
- **Scan mode**: `ReceiptPreviewCard` shows the captured image + scanning
  spinner immediately after camera returns, above the extracted-fields preview.
- **Draft state survives mode switching**: `amountInput`/`merchantInput`
  already persist across tab changes; extend this so switching away from a
  mid-SMS-selection or mid-scan draft and back doesn't lose it. `resetState()`
  only fires on explicit Save/Close, never on tab change.

## Component plan

- **New**: `SmartSuggestionsSection.tsx`, `QuickAmountRow.tsx`,
  `RecentMerchantRow.tsx`, `PredictionBanner.tsx`
- **Rewrite**: `AddTransactionSheet.tsx` (mode logic, SMS embed, scan image
  preview, remove dead recent/favorite tab paths)
- **Modify**: `TransactionEntryModeTabs.tsx` (drop 4th tab),
  `TransactionPreviewCard.tsx` (drop duplicate confidence footer, now owned by
  `PredictionBanner`), `StickySaveBar.tsx` (add recurring-candidate label case)
- **Delete**: `AiAssistantCard.tsx`, `TimelineSuggestions.tsx`
- **Untouched**: all 4 services, `SmsInboxRow.tsx`, `ReceiptPreviewCard.tsx`,
  `SmsReviewScreen.tsx`

## Data flow

Single `draft: TransactionDraft` plus `amountInput`/`merchantInput` stay the
source of truth. SMS-row-tap and receipt-scan both call `setDraft` the same way
manual typing does, so `PredictionBanner`, budget-impact, and save-bar logic
don't fork per mode.

## Error handling

Camera/permission errors already handled (Alert + fallback to manual) — keep
as-is. SMS fetch failure inside the sheet shows an inline empty state in the
tab rather than a blocking Alert, since SMS is an assistive path, not required.

## Testing

No existing test infra touches the screen itself
(`__tests__/TransactionPredictionService.test.ts` and
`MerchantLearningService.test.ts` are service-only). Extend those if
prediction/recurring logic changes. Screen itself verified via simulator run
(manual/SMS/scan/empty-SMS states).
