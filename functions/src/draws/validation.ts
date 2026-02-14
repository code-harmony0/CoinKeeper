/**
 * Draw Validation Logic
 * Validates group eligibility and draw rules
 */

import * as admin from 'firebase-admin';
import type {
  Draw,
  DrawValidationResult,
  GroupEligibility,
  ParticipantSnapshot,
} from './types';

const db = admin.firestore();

// ==================== CONFIGURATION ====================

const VALIDATION_CONFIG = {
  minimumMembers: 2,
  minimumContributionRate: 0.5, // 50% of expected contributions
  maxDrawsPerMonth: 4,
  blackoutDays: [] as number[], // Day of week (0=Sunday) when draws are not allowed
  gracePeriodHours: 24, // Hours before scheduled draw to freeze participants
};

// ==================== GROUP ELIGIBILITY ====================

/**
 * Check if a group is eligible and validate draw rules
 */
export const validateGroupEligibility = async (
  groupId: string,
  scheduledAt: admin.firestore.Timestamp
): Promise<GroupEligibility> => {
  const result: GroupEligibility = {
    isEligible: true,
    activeStatus: true,
    sufficientContributions: true,
    minimumMembers: true,
    noBlackoutPeriod: true,
    withinDrawLimit: true,
  };

  try {
    // Fetch group document
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return {
        isEligible: false,
        reason: 'Group not found',
        activeStatus: false,
        sufficientContributions: false,
        minimumMembers: false,
        noBlackoutPeriod: false,
        withinDrawLimit: false,
      };
    }

    const group = groupDoc.data()!;

    // Check 1: Active status
    if (group.status !== 'active') {
      result.activeStatus = false;
      result.isEligible = false;
      result.reason = `Group is not active (status: ${group.status})`;
      return result;
    }

    // Check 2: Minimum members
    const membersSnapshot = await db
      .collection('group_members')
      .where('groupId', '==', groupId)
      .where('status', '==', 'active')
      .get();

    if (membersSnapshot.size < VALIDATION_CONFIG.minimumMembers) {
      result.minimumMembers = false;
      result.isEligible = false;
      result.reason = `Insufficient members: ${membersSnapshot.size} < ${VALIDATION_CONFIG.minimumMembers}`;
      return result;
    }

    // Check 3: Sufficient contributions
    const expectedContributions = membersSnapshot.size * (group.contributionAmount || 0);
    const contributionsSnapshot = await db
      .collection('contributions')
      .where('groupId', '==', groupId)
      .where('status', '==', 'verified')
      .get();

    const totalContributions = contributionsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0),
      0
    );

    const contributionRate = expectedContributions > 0
      ? totalContributions / expectedContributions
      : 0;

    if (contributionRate < VALIDATION_CONFIG.minimumContributionRate) {
      result.sufficientContributions = false;
      result.isEligible = false;
      result.reason = `Insufficient contributions: ${(contributionRate * 100).toFixed(0)}% < ${VALIDATION_CONFIG.minimumContributionRate * 100}%`;
      return result;
    }

    // Check 4: Blackout period
    const scheduledDate = scheduledAt.toDate();
    const dayOfWeek = scheduledDate.getDay();
    if (VALIDATION_CONFIG.blackoutDays.includes(dayOfWeek)) {
      result.noBlackoutPeriod = false;
      result.isEligible = false;
      result.reason = `Draws not allowed on this day of week`;
      return result;
    }

    // Check 5: Draw limit per month
    const startOfMonth = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), 1);
    const endOfMonth = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth() + 1, 0);

    const monthDrawsSnapshot = await db
      .collection('draws')
      .where('groupId', '==', groupId)
      .where('scheduledAt', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
      .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(endOfMonth))
      .where('status', 'in', ['scheduled', 'completed'])
      .get();

    if (monthDrawsSnapshot.size >= VALIDATION_CONFIG.maxDrawsPerMonth) {
      result.withinDrawLimit = false;
      result.isEligible = false;
      result.reason = `Draw limit reached: ${monthDrawsSnapshot.size} >= ${VALIDATION_CONFIG.maxDrawsPerMonth} per month`;
      return result;
    }

    return result;
  } catch (error) {
    console.error('[validateGroupEligibility] Error:', error);
    return {
      isEligible: false,
      reason: `Validation error: ${(error as Error).message}`,
      activeStatus: false,
      sufficientContributions: false,
      minimumMembers: false,
      noBlackoutPeriod: false,
      withinDrawLimit: false,
    };
  }
};

// ==================== PARTICIPANT VALIDATION ====================

/**
 * Compute eligible participant snapshot for a draw
 */
export const computeParticipantSnapshot = async (
  groupId: string,
  scheduledAt: admin.firestore.Timestamp,
  excludeWinnerIds: string[] = []
): Promise<ParticipantSnapshot[]> => {
  const participants: ParticipantSnapshot[] = [];

  try {
    // Fetch active members
    const membersSnapshot = await db
      .collection('group_members')
      .where('groupId', '==', groupId)
      .where('status', '==', 'active')
      .get();

    // Fetch contributions for weight calculation
    const contributionsSnapshot = await db
      .collection('contributions')
      .where('groupId', '==', groupId)
      .where('status', '==', 'verified')
      .get();

    // Build contribution map by member
    const contributionsByMember: Record<string, number> = {};
    contributionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const memberId = data.memberId;
      contributionsByMember[memberId] = (contributionsByMember[memberId] || 0) + data.amount;
    });

    // Build participant snapshots
    for (const memberDoc of membersSnapshot.docs) {
      const member = memberDoc.data();
      const memberId = memberDoc.id;
      const contributions = contributionsByMember[memberId] || 0;

      // Determine eligibility
      let isEligible = true;
      let eligibilityReason: string | undefined;

      // Rule: Must have at least one contribution
      if (contributions <= 0) {
        isEligible = false;
        eligibilityReason = 'No verified contributions';
      }

      // Rule: Cannot be a previous winner (if specified)
      if (excludeWinnerIds.includes(memberId)) {
        isEligible = false;
        eligibilityReason = 'Already won in this cycle';
      }

      // Rule: Member must have joined before cutoff
      const joinDate = member.joinedAt?.toDate() || new Date(0);
      const cutoffDate = new Date(scheduledAt.toDate());
      cutoffDate.setHours(cutoffDate.getHours() - VALIDATION_CONFIG.gracePeriodHours);

      if (joinDate > cutoffDate) {
        isEligible = false;
        eligibilityReason = 'Joined after eligibility cutoff';
      }

      participants.push({
        memberId,
        memberName: member.name || 'Unknown',
        memberPhone: member.phone || '',
        weight: contributions, // Weight = total contributions
        contributionAmount: contributions,
        isEligible,
        eligibilityReason,
      });
    }

    return participants;
  } catch (error) {
    console.error('[computeParticipantSnapshot] Error:', error);
    throw new Error('Failed to compute participant snapshot');
  }
};

// ==================== DRAW VALIDATION ====================

/**
 * Full validation of a draw before execution
 */
export const validateDraw = async (
  draw: Draw
): Promise<DrawValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate group eligibility
  const groupEligibility = await validateGroupEligibility(draw.groupId, draw.scheduledAt as admin.firestore.Timestamp);
  if (!groupEligibility.isEligible) {
    errors.push(groupEligibility.reason || 'Group not eligible');
  }

  // Compute participant snapshot
  const participants = await computeParticipantSnapshot(
    draw.groupId,
    draw.scheduledAt as admin.firestore.Timestamp
  );

  const eligibleCount = participants.filter(p => p.isEligible).length;
  const totalCount = participants.length;

  if (eligibleCount === 0) {
    errors.push('No eligible participants');
  } else if (eligibleCount < VALIDATION_CONFIG.minimumMembers) {
    errors.push(`Insufficient eligible participants: ${eligibleCount} < ${VALIDATION_CONFIG.minimumMembers}`);
  }

  // Warnings
  if (eligibleCount < totalCount * 0.5) {
    warnings.push(`Low eligibility rate: ${eligibleCount}/${totalCount} (${((eligibleCount / totalCount) * 100).toFixed(0)}%)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    eligibleParticipants: eligibleCount,
    totalParticipants: totalCount,
  };
};

// ==================== IDEMPOTENCY KEY ====================

/**
 * Generate idempotency key for draw job
 */
export const generateDrawJobIdempotencyKey = (
  drawId: string,
  scheduledAt: admin.firestore.Timestamp
): string => {
  const date = scheduledAt.toDate();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  return `${drawId}_${dateStr}`;
};
