import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type NotificationType = 'approval' | 'system' | 'payment' | 'draw' | 'member' | 'alert';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationAction = 'approve_transaction' | 'view_member' | 'view_group' | 'view_payment' | 'view_draw' | 'none';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  readAt?: FirebaseFirestoreTypes.Timestamp;

  // Action
  action?: NotificationAction;
  actionUrl?: string;
  actionData?: Record<string, any>;

  // Related entities
  groupId?: string;
  memberId?: string;
  transactionId?: string;
  drawId?: string;

  // Metadata
  icon?: string;
  color?: string;
  badge?: string;

  // Delivery
  delivered: boolean;
  deliveredAt?: FirebaseFirestoreTypes.Timestamp;
  pushed: boolean; // Push notification sent
  pushedAt?: FirebaseFirestoreTypes.Timestamp;

  // Expiry
  expiresAt?: FirebaseFirestoreTypes.Timestamp;

  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface ApprovalAlert extends Notification {
  type: 'approval';
  requestType: 'transaction' | 'member' | 'group' | 'withdrawal';
  requestId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAmount?: number;
  requiresAction: boolean;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: FirebaseFirestoreTypes.Timestamp;
}

export interface SystemAlert extends Notification {
  type: 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'maintenance' | 'security' | 'update' | 'error' | 'announcement';
  affectedUsers?: string[];
  resolutionStatus?: 'pending' | 'in_progress' | 'resolved';
  resolvedAt?: FirebaseFirestoreTypes.Timestamp;
}

export interface NotificationStats {
  total: number;
  unread: number;
  highPriority: number;
  pendingApprovals: number;
  systemAlerts: number;
  todayCount: number;
}

export interface NotificationSettings {
  id: string;
  userId: string;

  // Channel preferences
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;

  // Type preferences
  approvalNotifications: boolean;
  systemNotifications: boolean;
  paymentNotifications: boolean;
  drawNotifications: boolean;
  memberNotifications: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string; // HH:mm

  // Priority filter
  minPriority: NotificationPriority;

  updatedAt: FirebaseFirestoreTypes.Timestamp;
}
