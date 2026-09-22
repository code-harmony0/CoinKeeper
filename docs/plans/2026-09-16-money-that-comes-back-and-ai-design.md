# Money that comes back, AI scanning, and a chat that answers

Design agreed 2026-09-16.

## 1. Money that comes back

Money lent to a person, or moved between the user's own accounts, is neither
income nor expense. It leaves and it returns.

### What the data says

Measured on the user's real 1,204-message inbox: only **10** outgoing amounts
have a same-amount return within 120 days, and **none** of those share a
counterparty name. Two of them are an Airtel payment and its own confirmation
SMS — one event, two messages. The rest are coincidences: ₹70 to a person, ₹70
from HDFC 114 days later.

Detection alone therefore cannot carry this feature. Amount-only matching would
hide real spending; amount-plus-name matching would almost never fire.

### Behaviour

- Two new columns on `transactions`: `settlement_of` (the row this repays) and
  `awaiting_return` (money expected back).
- The user marks an outgoing transaction "I'll get this back". It leaves the
  expense total at once and appears under **Lent & returned**.
- A pair hides itself automatically **only** on same amount + matching
  counterparty + within 90 days. On the user's data this fires zero false
  hides.
- Anything looser — part repayments, near-miss amounts, amount-only matches —
  raises "Did this come back?" and waits for a tap.
- Both sides naming accounts the user owns is a self-transfer: hidden, never
  counted.
- Matched pairs leave the main list and its totals, and live on a **Lent &
  returned** screen with outstanding amounts at the top.

## 2. Reading messages, with or without AI

Tapping the message icon asks first:

- **Read normally** — rules and the bundled library. 48 ms for the whole inbox,
  incremental after the first scan.
- **Read with AI** — the model is offered as a one-time 278 MB download if it is
  absent, then reads only what the rules could not: roughly 200 messages on this
  user's phone, not 1,204.

The AI path imports what it finds without asking, guarded by two cheap things:
likely duplicates are held back, and the batch summary carries a single
**Undo**. Rows are badged 🤖 Read by AI or 📋 Read by rules.

A 270M model costs roughly 1–3 seconds per message, so 200 unknown messages may
take 5–10 minutes. The scan shows progress, can be cancelled, keeps what it
finished, and works newest-first so useful results arrive early. Real speed to
be measured on device before the batch size is fixed.

## 3. The chat

Numbers are always computed from the ledger. The model never produces a figure.

- Ledger answers: spending by category, merchant or month, comparisons against
  last month, what is still lent out, bills, safe-to-spend.
- The model maps loosely worded questions onto those lookups, phrases the reply,
  and holds context for follow-ups ("and last month?").
- Without the model the chat still answers, in fixed wording.
- A question the ledger cannot answer gets an honest refusal, not a guess.

## 4. Where AI stays out

It never computes or edits an amount, never hides a pair without an exact
amount and name match, never deletes anything, and never leaves the phone.

## Open questions

- Measured model latency per message on this device.
- Whether the two app flavors should share one downloaded model file (they have
  separate private storage today, so the 278 MB download happens per app).
