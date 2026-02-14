# Firestore Schema Documentation

Complete schema definitions for the Collection Management module.

## Collections Overview

| Collection | Purpose | Primary Indexes |
|------------|---------|----------------|
| `scheduledPayments` | Precomputed upcoming payments | groupId+dueDate, status+dueDate |
| `payments` | Concrete payment records | memberId+createdAt, status |
| `autoDebitJobs` | Auto-debit execution jobs | status+scheduledFor, idempotencyKey |
| `notificationLogs` | Reminder delivery logs | recipientId+createdAt |
| `paymentReconciliations` | Gateway webhook matching | status+createdAt |
| `auditLogs` | Comprehensive action trail | targetId+timestamp |
| `reminderTemplates` | Reminder message templates | groupId+type |
| `escalationRules` | Group escalation config | groupId |
| `autoDebitConsent` | Member consent records | memberId+groupId |

---

## Schema Definitions

### `scheduledPayments/`

```typescript
{
  id: string;                    // Document ID
  idempotencyKey: string;        // memberId_groupId_YYYY-MM-DD
  
  // Relationships
  groupId: string;
  memberId: string;
  
  // Denormalized for queries
  groupName: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string;
  
  // Payment details
  amount: number;
  dueDate: Timestamp;
  cycleNumber: number;
  
  // Status
  status: 'pending' | 'reminded' | 'processing' | 'paid' | 'overdue' | 'failed' | 'skipped';
  autoDebitEnabled: boolean;
  
  // Reminders
  remindersSent: number;
  lastReminderAt?: Timestamp;
  
  // Overdue handling
  overdueAt?: Timestamp;
  daysOverdue?: number;
  lateFeeAmount?: number;
  lateFeeApplied: boolean;
  
  // Resolution
  paidAt?: Timestamp;
  paymentId?: string;            // Reference to payments/
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `payments/`

```typescript
{
  id: string;
  
  // Relationships
  scheduledPaymentId?: string;
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  
  // Payment details
  amount: number;
  method: 'manual' | 'auto_debit' | 'gateway' | 'cash' | 'bank_transfer' | 'upi' | 'card';
  
  // Status
  status: 'initiated' | 'success' | 'failed' | 'refunded';
  
  // Gateway info
  gatewayReference?: string;
  gatewayResponse?: object;
  transactionId?: string;
  
  // Processing
  processedBy?: string;          // adminId or 'system'
  processedAt?: Timestamp;
  
  // Reconciliation
  reconciliationStatus: 'pending' | 'matched' | 'unmatched' | 'mismatch' | 'duplicate' | 'manual';
  reconciliationAt?: Timestamp;
  reconciliationId?: string;
  
  // Refund
  refundedAt?: Timestamp;
  refundReason?: string;
  
  // Metadata
  metadata?: object;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `autoDebitJobs/`

```typescript
{
  id: string;
  idempotencyKey: string;        // memberId_groupId_YYYY-MM-DD
  
  // Relationships
  scheduledPaymentId: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  groupId: string;
  groupName: string;
  
  // Job details
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  
  // Retry tracking
  attempts: number;
  maxAttempts: number;           // Default: 3
  lastAttemptAt?: Timestamp;
  nextRetryAt?: Timestamp;
  lastError?: string;
  
  // Consent verification
  consentVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  bankToken?: string;
  
  // Scheduling
  scheduledFor: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  
  // Result
  paymentId?: string;            // Reference on success
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `notificationLogs/`

```typescript
{
  id: string;
  
  // Type
  type: 'reminder' | 'alert' | 'confirmation' | 'escalation';
  channel: 'sms' | 'whatsapp' | 'push' | 'email';
  
  // Recipient
  recipientId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  
  // Content
  templateId?: string;
  templateVariables?: object;
  message: string;
  subject?: string;
  
  // Delivery
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  providerName?: string;
  providerMessageId?: string;
  providerResponse?: object;
  errorMessage?: string;
  
  // Retry
  retryCount: number;
  maxRetries: number;
  
  // Relationships
  scheduledPaymentId?: string;
  groupId?: string;
  
  // Timestamps
  createdAt: Timestamp;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
}
```

---

### `paymentReconciliations/`

```typescript
{
  id: string;
  
  // Matching
  paymentId?: string;
  scheduledPaymentId?: string;
  gatewayReference: string;
  gatewayEvent: string;
  gatewayName: string;
  
  // Webhook data
  webhookPayload: object;
  
  // Result
  status: 'matched' | 'unmatched' | 'duplicate' | 'mismatch';
  matchedAmount?: number;
  receivedAmount?: number;
  amountDifference?: number;
  matchReason?: string;
  
  // Manual handling
  manuallyReconciledBy?: string;
  manuallyReconciledAt?: Timestamp;
  notes?: string;
  
  // Timestamps
  processedAt: Timestamp;
  createdAt: Timestamp;
}
```

---

### `auditLogs/`

```typescript
{
  id: string;
  
  // Action
  action: string;                // e.g., 'auto_debit_attempt', 'payment_success'
  
  // Actor
  actorId: string;
  actorType: 'admin' | 'system' | 'scheduler' | 'webhook';
  actorName?: string;
  
  // Target
  targetCollection: string;
  targetId: string;
  targetName?: string;
  
  // Payload
  payload: object;
  previousState?: object;
  newState?: object;
  
  // Result
  success: boolean;
  errorMessage?: string;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  metadata?: object;
  
  // Timestamp
  timestamp: Timestamp;
}
```

---

## Recommended Indexes

Create these composite indexes in Firebase Console or via `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "scheduledPayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "groupId", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "scheduledPayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "scheduledPayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reconciliationStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "autoDebitJobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledFor", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "targetCollection", "order": "ASCENDING" },
        { "fieldPath": "targetId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notificationLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin-only collections
    match /scheduledPayments/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Server-only
    }
    
    match /payments/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create: if request.auth != null && request.auth.token.admin == true;
      allow update, delete: if false; // Server-only
    }
    
    match /autoDebitJobs/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Server-only
    }
    
    match /auditLogs/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Server-only
    }
    
    match /notificationLogs/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Server-only
    }
    
    match /paymentReconciliations/{doc} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Server-only
    }
    
    // Member-accessible with restrictions
    match /autoDebitConsent/{doc} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.memberId || request.auth.token.admin == true);
      allow create, update: if request.auth != null && request.auth.uid == request.resource.data.memberId;
      allow delete: if false;
    }
  }
}
```
