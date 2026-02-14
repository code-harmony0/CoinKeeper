/**
 * Seed Firestore using firebase-tools (uses `firebase login` credentials)
 * Run: node scripts/seed-firestore.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'coinkeeper-c53e7';

// Read the Firebase CLI refresh token
const configPath = path.join(require('os').homedir(), '.config/configstore/firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = config.tokens.refresh_token;

// Exchange refresh token for access token via Google OAuth
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).access_token));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Firestore REST API helper
async function firestoreRequest(method, docPath, body) {
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Convert JS object to Firestore document format
function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

async function createDoc(collection, docId, data) {
  const doc = toFirestoreDoc(data);
  if (docId) {
    await firestoreRequest('PATCH', `${collection}/${docId}`, doc);
  } else {
    await firestoreRequest('POST', collection, doc);
  }
}

async function seed() {
  console.log(`Seeding Firestore for ${PROJECT_ID}...\n`);

  const now = new Date();
  const adminId = 'admin001';

  // 1. USERS
  console.log('1. Creating users...');
  const users = [
    { uid: adminId, email: 'admin@coinkeeper.app', name: 'Admin User', phoneNumber: '+919876543210', isAdmin: true, onboardingCompleted: true },
    { uid: 'user001', email: 'sarah@example.com', name: 'Sarah Johnson', phoneNumber: '+919876543211', isAdmin: false, onboardingCompleted: true },
    { uid: 'user002', email: 'priya@example.com', name: 'Priya Sharma', phoneNumber: '+919876543212', isAdmin: false, onboardingCompleted: true },
    { uid: 'user003', email: 'amit@example.com', name: 'Amit Patel', phoneNumber: '+919876543213', isAdmin: false, onboardingCompleted: true },
    { uid: 'user004', email: 'neha@example.com', name: 'Neha Gupta', phoneNumber: '+919876543214', isAdmin: false, onboardingCompleted: true },
    { uid: 'user005', email: 'raj@example.com', name: 'Raj Kumar', phoneNumber: '+919876543215', isAdmin: false, onboardingCompleted: true },
  ];
  for (const user of users) {
    await createDoc('users', user.uid, user);
  }
  console.log('   done - 6 users');

  // 2. GROUPS
  console.log('2. Creating groups...');
  await createDoc('groups', 'group001', {
    name: 'Family Savings Circle', contributionAmount: 5000, cycleTime: 30, maxMembers: 12,
    activeMembers: 5, totalPooled: 75000, autoDebit: false, status: 'active',
    startDate: new Date('2024-01-01'), createdAt: now, updatedAt: now,
    createdBy: adminId, archived: false, closed: false,
  });
  await createDoc('groups', 'group002', {
    name: 'Office Colleagues Fund', contributionAmount: 10000, cycleTime: 30, maxMembers: 20,
    activeMembers: 4, totalPooled: 120000, autoDebit: true, status: 'active',
    startDate: new Date('2024-03-15'), createdAt: now, updatedAt: now,
    createdBy: adminId, archived: false, closed: false,
  });
  await createDoc('groups', 'group003', {
    name: 'Neighborhood Chit', contributionAmount: 2000, cycleTime: 30, maxMembers: 10,
    activeMembers: 3, totalPooled: 18000, autoDebit: false, status: 'pending',
    startDate: new Date('2025-01-01'), createdAt: now, updatedAt: now,
    createdBy: adminId, archived: false, closed: false,
  });
  console.log('   done - 3 groups');

  // 3. GROUP MEMBERS
  console.log('3. Creating group members...');
  const members = [
    { groupId: 'group001', userId: 'user001', userName: 'Sarah Johnson', userEmail: 'sarah@example.com', userPhone: '+919876543211', contributionStatus: 'active', totalContributed: 25000, missedPayments: 0, status: 'active' },
    { groupId: 'group001', userId: 'user002', userName: 'Priya Sharma', userEmail: 'priya@example.com', userPhone: '+919876543212', contributionStatus: 'active', totalContributed: 20000, missedPayments: 1, status: 'active' },
    { groupId: 'group001', userId: 'user003', userName: 'Amit Patel', userEmail: 'amit@example.com', userPhone: '+919876543213', contributionStatus: 'active', totalContributed: 15000, missedPayments: 0, status: 'active' },
    { groupId: 'group001', userId: 'user004', userName: 'Neha Gupta', userEmail: 'neha@example.com', userPhone: '+919876543214', contributionStatus: 'pending', totalContributed: 10000, missedPayments: 2, status: 'active' },
    { groupId: 'group001', userId: 'user005', userName: 'Raj Kumar', userEmail: 'raj@example.com', userPhone: '+919876543215', contributionStatus: 'active', totalContributed: 5000, missedPayments: 0, status: 'active' },
    { groupId: 'group002', userId: 'user001', userName: 'Sarah Johnson', userEmail: 'sarah@example.com', userPhone: '+919876543211', contributionStatus: 'active', totalContributed: 40000, missedPayments: 0, status: 'active' },
    { groupId: 'group002', userId: 'user003', userName: 'Amit Patel', userEmail: 'amit@example.com', userPhone: '+919876543213', contributionStatus: 'active', totalContributed: 30000, missedPayments: 1, status: 'active' },
  ];
  for (const m of members) {
    await createDoc('group_members', null, { ...m, joinedDate: now });
  }
  console.log('   done - 7 members');

  // 4. CONTRIBUTIONS
  console.log('4. Creating contributions...');
  const statuses = ['pending', 'paid', 'approved', 'paid', 'paid'];
  for (let i = 0; i < 5; i++) {
    const u = users[i + 1];
    await createDoc('contributions', null, {
      groupId: 'group001', userId: u.uid, userName: u.name, groupName: 'Family Savings Circle',
      amount: 5000, dueDate: new Date(2025, 1, 15), status: statuses[i],
      paymentMethod: statuses[i] !== 'pending' ? 'UPI' : null,
      paidAt: statuses[i] === 'paid' ? now : null,
      approvedAt: statuses[i] === 'approved' ? now : null,
      approvedBy: statuses[i] === 'approved' ? adminId : null,
      transactionId: null, notes: null, createdAt: now, updatedAt: now,
    });
  }
  console.log('   done - 5 contributions');

  // 5. WALLETS
  console.log('5. Creating wallet...');
  await createDoc('wallets', 'wallet001', {
    adminId, balance: 195000, lockedBalance: 50000, availableBalance: 145000,
    totalDeposits: 250000, totalWithdrawals: 55000, currency: 'INR',
    lastUpdated: now, createdAt: now,
  });
  console.log('   done - 1 wallet');

  // 6. WALLET TRANSACTIONS
  console.log('6. Creating wallet transactions...');
  const wtxns = [
    { type: 'deposit', amount: 50000, description: 'Initial deposit', method: 'bank_transfer' },
    { type: 'deposit', amount: 100000, description: 'Group contributions', method: 'UPI' },
    { type: 'withdrawal', amount: 25000, description: 'Draw payout - Sarah', method: 'bank_transfer' },
    { type: 'deposit', amount: 100000, description: 'Monthly collections', method: 'auto_debit' },
    { type: 'withdrawal', amount: 30000, description: 'Draw payout - Amit', method: 'UPI' },
  ];
  let bal = 0;
  for (const t of wtxns) {
    const before = bal;
    bal += t.type === 'deposit' ? t.amount : -t.amount;
    await createDoc('wallet_transactions', null, {
      walletId: 'wallet001', type: t.type, amount: t.amount,
      balanceBefore: before, balanceAfter: bal, status: 'completed',
      method: t.method, description: t.description, initiatedBy: adminId,
      initiatedDate: now, completedDate: now, retryCount: 0, receiptGenerated: false,
      createdAt: now, updatedAt: now,
    });
  }
  console.log('   done - 5 wallet transactions');

  // 7. DRAWS
  console.log('7. Creating draws...');
  await createDoc('draws', 'draw001', {
    groupId: 'group001', groupName: 'Family Savings Circle', drawNumber: 1,
    status: 'completed', scheduledDate: new Date('2024-02-01'),
    totalPrizeAmount: 60000, bidsReceived: 4, winnerId: 'user001', winningBid: 55000,
    participantCount: 5, completedDate: new Date('2024-02-01'),
    createdAt: now, updatedAt: now, createdBy: adminId,
  });
  await createDoc('draws', 'draw002', {
    groupId: 'group001', groupName: 'Family Savings Circle', drawNumber: 2,
    status: 'upcoming', scheduledDate: new Date('2025-03-01'),
    totalPrizeAmount: 60000, bidsReceived: 0, winnerId: null, winningBid: null,
    participantCount: 5, completedDate: null,
    createdAt: now, updatedAt: now, createdBy: adminId,
  });
  console.log('   done - 2 draws');

  // 8. TRANSACTIONS
  console.log('8. Creating transactions...');
  const txns = [
    { userId: 'user001', amount: 50000, type: 'income', category: 'Salary', categoryIcon: 'cash', description: 'Monthly salary', paymentMethod: 'Bank' },
    { userId: 'user001', amount: 5000, type: 'expense', category: 'Chit Fund', categoryIcon: 'cash', description: 'Monthly contribution', paymentMethod: 'UPI' },
    { userId: 'user001', amount: 350, type: 'expense', category: 'Food', categoryIcon: 'food', description: 'Lunch at restaurant', paymentMethod: 'UPI' },
    { userId: 'user001', amount: 120, type: 'expense', category: 'Transport', categoryIcon: 'car', description: 'Uber ride', paymentMethod: 'Card' },
    { userId: 'user001', amount: 2500, type: 'expense', category: 'Shopping', categoryIcon: 'shopping', description: 'Amazon order', paymentMethod: 'Card' },
  ];
  for (const t of txns) {
    await createDoc('transactions', null, { ...t, date: now, createdAt: now, updatedAt: now });
  }
  console.log('   done - 5 transactions');

  // 9. UPCOMING PAYMENTS
  console.log('9. Creating upcoming payments...');
  for (let i = 1; i <= 5; i++) {
    const u = users[i];
    await createDoc('upcoming_payments', null, {
      groupId: 'group001', memberId: u.uid, amount: 5000,
      dueDate: new Date(2025, 2, 1),
      status: i <= 2 ? 'paid' : i <= 3 ? 'reminded' : 'scheduled',
      reminderSent: i <= 3, reminderSentDate: i <= 3 ? now : null,
      createdAt: now, updatedAt: now,
    });
  }
  console.log('   done - 5 upcoming payments');

  // 10. ESCALATION RULES
  console.log('10. Creating escalation rules...');
  await createDoc('escalationRules', 'group001', {
    groupId: 'group001', enabled: true, gracePeriodDays: 3, reminderFrequencyDays: 2,
    maxReminders: 5, lateFeeEnabled: true, lateFeeType: 'percentage', lateFeeAmount: 2,
    lateFeeMaxCap: 500, autoSuspendEnabled: true, autoSuspendAfterDays: 30,
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 escalation rule');

  // 11. SETTLEMENT RULES
  console.log('11. Creating settlement rules...');
  await createDoc('settlement_rules', null, {
    name: 'Default Settlement', type: 'auto', enabled: true, executionCount: 0,
    createdAt: now, updatedAt: now, createdBy: adminId,
  });
  console.log('   done - 1 settlement rule');

  // 12. AUDIT LOGS
  console.log('12. Creating audit logs...');
  await createDoc('auditLogs', null, {
    action: 'group_created', actorId: adminId, actorType: 'admin',
    targetCollection: 'groups', targetId: 'group001',
    payload: { name: 'Family Savings Circle' }, success: true,
    timestamp: now, createdAt: now,
  });
  console.log('   done - 1 audit log');

  // 13. CONTRIBUTION AUDIT LOG
  console.log('13. Creating contribution audit logs...');
  await createDoc('contributionAuditLog', null, {
    contributionId: 'contrib001', action: 'approved', performedBy: adminId,
    timestamp: now, metadata: { groupId: 'group001', amount: 5000 },
  });
  console.log('   done - 1 contribution audit log');

  // 14. DRAW BIDS
  console.log('14. Creating draw bids...');
  const bids = [
    { drawId: 'draw001', memberId: 'user001', bidAmount: 55000, status: 'won', validationStatus: 'valid' },
    { drawId: 'draw001', memberId: 'user002', bidAmount: 52000, status: 'lost', validationStatus: 'valid' },
    { drawId: 'draw001', memberId: 'user003', bidAmount: 48000, status: 'lost', validationStatus: 'valid' },
    { drawId: 'draw001', memberId: 'user004', bidAmount: 45000, status: 'lost', validationStatus: 'valid' },
  ];
  for (const b of bids) {
    await createDoc('draw_bids', null, { ...b, timestamp: now, createdAt: now });
  }
  console.log('   done - 4 draw bids');

  // 15. DRAW WINNERS
  console.log('15. Creating draw winners...');
  await createDoc('draw_winners', null, {
    drawId: 'draw001', drawNumber: 1, groupId: 'group001', groupName: 'Family Savings Circle',
    memberId: 'user001', memberName: 'Sarah Johnson', memberPhone: '+919876543211',
    winningBid: 55000, prizeAmount: 60000, settlementStatus: 'completed',
    announcedDate: now, notificationSent: true, receiptGenerated: false, createdAt: now,
  });
  console.log('   done - 1 draw winner');

  // 16. DRAW SETTLEMENTS
  console.log('16. Creating draw settlements...');
  await createDoc('draw_settlements', null, {
    drawId: 'draw001', winnerId: 'user001', amount: 55000,
    settlementDate: now, status: 'completed', paymentTransactionId: 'txn_draw_001',
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 draw settlement');

  // 17. GROUP TRANSACTIONS
  console.log('17. Creating group transactions...');
  await createDoc('group_transactions', null, {
    groupId: 'group001', type: 'contribution', amount: 5000,
    date: now, description: 'Monthly contribution - Sarah', performedBy: 'user001',
    createdAt: now,
  });
  await createDoc('group_transactions', null, {
    groupId: 'group001', type: 'payout', amount: 55000,
    date: now, description: 'Draw payout - Sarah', performedBy: adminId,
    createdAt: now,
  });
  console.log('   done - 2 group transactions');

  // 18. GROUP DRAWS
  console.log('18. Creating group draws...');
  await createDoc('group_draws', null, {
    groupId: 'group001', drawId: 'draw001', scheduledDate: new Date('2024-02-01'),
    status: 'completed', totalPrizeAmount: 60000, createdAt: now,
  });
  console.log('   done - 1 group draw');

  // 19. GROUP CONTRIBUTIONS
  console.log('19. Creating group contributions...');
  await createDoc('group_contributions', null, {
    groupId: 'group001', userId: 'user001', amount: 5000,
    dueDate: new Date(2025, 1, 15), status: 'paid', createdAt: now,
  });
  console.log('   done - 1 group contribution');

  // 20. PAYMENT HISTORY
  console.log('20. Creating payment history...');
  await createDoc('payment_history', null, {
    groupId: 'group001', memberId: 'user001', amount: 5000,
    paidDate: now, method: 'UPI', status: 'completed', createdAt: now,
  });
  await createDoc('payment_history', null, {
    groupId: 'group001', memberId: 'user002', amount: 5000,
    paidDate: now, method: 'bank_transfer', status: 'completed', createdAt: now,
  });
  console.log('   done - 2 payment history records');

  // 21. AUTO DEBIT SCHEDULES
  console.log('21. Creating auto debit schedules...');
  await createDoc('auto_debit_schedules', null, {
    groupId: 'group002', memberId: 'user001', amount: 10000,
    frequency: 'monthly', nextDebitDate: new Date(2025, 2, 15),
    enabled: true, paymentMethodId: 'upi_auto_001', createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 auto debit schedule');

  // 22. REMINDER AUTOMATION
  console.log('22. Creating reminder automation...');
  await createDoc('reminder_automation', null, {
    groupId: 'group001', type: 'overdue_payment', threshold: 3,
    templateId: 'template001', lastRunDate: now, enabled: true,
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 reminder automation');

  // 23. SCHEDULED PAYMENTS
  console.log('23. Creating scheduled payments...');
  await createDoc('scheduledPayments', null, {
    groupId: 'group001', memberId: 'user001', amount: 5000,
    dueDate: new Date(2025, 2, 1), status: 'pending',
    paymentType: 'contribution', autoDebitEnabled: false,
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 scheduled payment');

  // 24. PAYMENTS
  console.log('24. Creating payments...');
  await createDoc('payments', null, {
    groupId: 'group001', memberId: 'user001', amount: 5000,
    status: 'success', reconciliationStatus: 'matched',
    paymentMethod: 'UPI', transactionId: 'upi_txn_001',
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 payment');

  // 25. PAYMENT RECONCILIATIONS
  console.log('25. Creating payment reconciliations...');
  await createDoc('paymentReconciliations', null, {
    paymentId: 'payment_001', externalTransactionId: 'bank_txn_xyz',
    status: 'matched', amount: 5000, matchedAt: now,
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 reconciliation');

  // 26. REMINDER TEMPLATES
  console.log('26. Creating reminder templates...');
  await createDoc('reminderTemplates', 'template001', {
    type: 'overdue', name: 'Overdue Reminder',
    templateBody: 'Hi {{name}}, your payment for {{groupName}} is overdue.',
    channel: 'SMS', groupId: null, enabled: true, createdBy: adminId,
    createdAt: now, updatedAt: now,
  });
  console.log('   done - 1 reminder template');

  // 27. NOTIFICATION LOGS
  console.log('27. Creating notification logs...');
  await createDoc('notificationLogs', null, {
    recipientId: 'user004', groupId: 'group001',
    channel: 'SMS', status: 'sent',
    message: 'Reminder: Your contribution of ₹5,000 for Family Savings Circle is due.',
    sentAt: now, createdAt: now,
  });
  console.log('   done - 1 notification log');

  console.log('\nFirestore seeded successfully!');
  console.log('27 collections, 70+ documents created.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
