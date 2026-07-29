import firestore from '@react-native-firebase/firestore';
import type {
  Draw,
  DrawBid,
  DrawWinner,
  DrawSettlement,
  DrawStats,
} from '../types/draw';

const COLLECTIONS = {
  DRAWS: 'draws',
  DRAW_BIDS: 'draw_bids',
  DRAW_WINNERS: 'draw_winners',
  DRAW_SETTLEMENTS: 'draw_settlements',
};

export const drawsService = {
  // ==================== DRAW MANAGEMENT ====================

  createDraw: async (
    drawData: Omit<Draw, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string,
  ): Promise<Draw> => {
    try {
      const ref = firestore().collection(COLLECTIONS.DRAWS).doc();

      const draw: Omit<Draw, 'id'> = {
        ...drawData,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
        updatedAt: firestore.FieldValue.serverTimestamp() as any,
        createdBy: adminId,
      };

      await ref.set(draw);
      const snapshot = await ref.get();
      return { id: snapshot.id, ...snapshot.data() } as Draw;
    } catch (error) {
      console.error('[drawsService] Error creating draw:', error);
      throw new Error('Failed to create draw');
    }
  },

  getDraw: async (drawId: string): Promise<Draw | null> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.DRAWS)
        .doc(drawId)
        .get();

      if (!snapshot.exists) return null;
      return { id: snapshot.id, ...snapshot.data() } as Draw;
    } catch (error) {
      console.error('[drawsService] Error fetching draw:', error);
      throw new Error('Failed to fetch draw');
    }
  },

  getUpcomingDraws: async (groupId?: string): Promise<Draw[]> => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.DRAWS)
        .where('status', 'in', ['upcoming', 'in_progress'])
        .orderBy('scheduledDate', 'asc');

      if (groupId) {
        query = query.where('groupId', '==', groupId) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Draw[];
    } catch (error) {
      console.error('[drawsService] Error fetching upcoming draws:', error);
      throw new Error('Failed to fetch upcoming draws');
    }
  },

  updateDraw: async (drawId: string, updates: Partial<Draw>): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.DRAWS)
        .doc(drawId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[drawsService] Error updating draw:', error);
      throw new Error('Failed to update draw');
    }
  },

  // ==================== BID MANAGEMENT ====================

  submitBid: async (
    bidData: Omit<DrawBid, 'id' | 'timestamp'>,
  ): Promise<DrawBid> => {
    try {
      const ref = firestore().collection(COLLECTIONS.DRAW_BIDS).doc();

      const bid: Omit<DrawBid, 'id'> = {
        ...bidData,
        timestamp: firestore.FieldValue.serverTimestamp() as any,
        status: 'pending',
        validationStatus: 'valid',
      };

      await ref.set(bid);

      // Update draw's bid count
      await firestore()
        .collection(COLLECTIONS.DRAWS)
        .doc(bidData.drawId)
        .update({
          bidsReceived: firestore.FieldValue.increment(1),
        });

      const snapshot = await ref.get();
      return { id: snapshot.id, ...snapshot.data() } as DrawBid;
    } catch (error) {
      console.error('[drawsService] Error submitting bid:', error);
      throw new Error('Failed to submit bid');
    }
  },

  getDrawBids: async (drawId: string): Promise<DrawBid[]> => {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.DRAW_BIDS)
        .where('drawId', '==', drawId)
        .orderBy('bidAmount', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DrawBid[];
    } catch (error) {
      console.error('[drawsService] Error fetching draw bids:', error);
      throw new Error('Failed to fetch draw bids');
    }
  },

  // ==================== WINNER SELECTION ====================

  selectWinner: async (
    drawId: string,
    winnerId: string,
    winningBid: number,
  ): Promise<DrawWinner> => {
    try {
      const batch = firestore().batch();

      // Get draw data
      const drawRef = firestore().collection(COLLECTIONS.DRAWS).doc(drawId);
      const drawSnap = await drawRef.get();
      const drawData = drawSnap.data() as Draw;

      // Fetch winner's member data
      const memberSnapshot = await firestore()
        .collection('group_members')
        .where('userId', '==', winnerId)
        .where('groupId', '==', drawData.groupId)
        .limit(1)
        .get();

      const memberData = memberSnapshot.docs[0]?.data();

      // Create winner record
      const winnerRef = firestore().collection(COLLECTIONS.DRAW_WINNERS).doc();
      const winnerData: Omit<DrawWinner, 'id'> = {
        drawId,
        drawNumber: drawData.drawNumber,
        groupId: drawData.groupId,
        groupName: drawData.groupName,
        memberId: winnerId,
        memberName: memberData?.userName || 'Unknown',
        memberPhone: memberData?.userPhone || '',
        winningBid,
        prizeAmount: drawData.totalPrizeAmount,
        settlementStatus: 'pending',
        announcedDate: firestore.FieldValue.serverTimestamp() as any,
        notificationSent: false,
        receiptGenerated: false,
        createdAt: firestore.FieldValue.serverTimestamp() as any,
      };
      batch.set(winnerRef, winnerData);

      // Update draw status
      batch.update(drawRef, {
        status: 'completed',
        winnerId,
        winningBid,
        completedDate: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update all bids status
      const bidsSnapshot = await firestore()
        .collection(COLLECTIONS.DRAW_BIDS)
        .where('drawId', '==', drawId)
        .get();

      bidsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: doc.data().memberId === winnerId ? 'won' : 'lost',
        });
      });

      await batch.commit();

      const winnerSnapshot = await winnerRef.get();
      return { id: winnerSnapshot.id, ...winnerSnapshot.data() } as DrawWinner;
    } catch (error) {
      console.error('[drawsService] Error selecting winner:', error);
      throw new Error('Failed to select winner');
    }
  },

  // ==================== SETTLEMENT ====================

  createSettlement: async (
    settlementData: Omit<DrawSettlement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.DRAW_SETTLEMENTS)
        .add({
          ...settlementData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[drawsService] Error creating settlement:', error);
      throw new Error('Failed to create settlement');
    }
  },

  updateSettlement: async (
    settlementId: string,
    updates: Partial<DrawSettlement>,
  ): Promise<void> => {
    try {
      await firestore()
        .collection(COLLECTIONS.DRAW_SETTLEMENTS)
        .doc(settlementId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('[drawsService] Error updating settlement:', error);
      throw new Error('Failed to update settlement');
    }
  },

  // ==================== REAL-TIME LISTENERS ====================

  onDrawsSnapshot: (
    callback: (draws: Draw[]) => void,
    onError?: (error: Error) => void,
    filters?: {
      status?: string[];
      groupId?: string;
    },
  ) => {
    try {
      let query = firestore()
        .collection(COLLECTIONS.DRAWS)
        .orderBy('scheduledDate', 'desc');

      if (filters?.groupId) {
        query = query.where('groupId', '==', filters.groupId) as any;
      }

      return query.onSnapshot(
        snapshot => {
          const draws = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Draw[];

          callback(draws);
        },
        error => {
          console.error('[drawsService] Snapshot error:', error);
          onError?.(error);
        },
      );
    } catch (error) {
      console.error('[drawsService] Error setting up listener:', error);
      throw new Error('Failed to set up listener');
    }
  },

  // ==================== STATS ====================

  getDrawStats: async (groupId?: string): Promise<DrawStats> => {
    try {
      let query = firestore().collection(COLLECTIONS.DRAWS);

      if (groupId) {
        query = query.where('groupId', '==', groupId) as any;
      }

      const snapshot = await query.get();
      const draws = snapshot.docs.map(doc => doc.data()) as Draw[];

      const totalDraws = draws.length;
      const upcomingDraws = draws.filter(d => d.status === 'upcoming').length;
      const completedDraws = draws.filter(d => d.status === 'completed').length;
      const cancelledDraws = draws.filter(d => d.status === 'cancelled').length;

      const completedWithPrize = draws.filter(
        d => d.status === 'completed' && d.totalPrizeAmount > 0,
      );
      const totalPrizeDisbursed = completedWithPrize.reduce(
        (sum, d) => sum + d.totalPrizeAmount,
        0,
      );

      // PERFORMANCE WARNING: This fetches all draw bids which is inefficient
      // for large datasets. Consider using Cloud Functions for aggregation
      // or implement pagination for bid analysis.
      // Read pre-aggregated bid average from drawSummaries instead of scanning all bids
      const summaryId = groupId || 'global';
      const summarySnap = await firestore()
        .collection('drawSummaries')
        .doc(summaryId)
        .get();
      const summaryData = summarySnap.data();
      const averageBidAmount = summaryData?.averageWinningBid ?? 0;

      const winningBids = draws
        .filter(d => d.winningBid)
        .map(d => d.winningBid!);
      const averageWinningBid =
        winningBids.length > 0
          ? winningBids.reduce((sum, bid) => sum + bid, 0) / winningBids.length
          : 0;

      // Calculate participation rate
      const drawsWithParticipants = draws.filter(d => d.participantCount > 0);
      const participationRate =
        drawsWithParticipants.length > 0
          ? drawsWithParticipants.reduce(
              (sum, d) => sum + d.participantCount,
              0,
            ) / drawsWithParticipants.length
          : 0;

      // Settlement rate
      const settlementsSnapshot = await firestore()
        .collection(COLLECTIONS.DRAW_SETTLEMENTS)
        .where('status', '==', 'completed')
        .get();
      const settlementRate =
        completedDraws > 0
          ? (settlementsSnapshot.size / completedDraws) * 100
          : 0;

      return {
        totalDraws,
        upcomingDraws,
        completedDraws,
        cancelledDraws,
        totalPrizeDisbursed,
        averageBidAmount,
        averageWinningBid,
        participationRate,
        settlementRate,
      };
    } catch (error) {
      console.error('[drawsService] Error fetching draw stats:', error);
      throw new Error('Failed to fetch draw stats');
    }
  },
};
