/**
 * Draw Selection Strategies
 * Pure, unit-testable functions for winner selection algorithms
 */

import * as crypto from 'crypto';
import type { ParticipantSnapshot, SelectionStep } from './types';

// ==================== INTERFACES ====================

export interface SelectionResult {
  winnerId: string;
  winnerIndex: number;
  steps: SelectionStep[];
  seed: string;
  algorithm: string;
}

export interface StrategyConfig {
  seed?: string;
  weightField?: keyof ParticipantSnapshot;
  minBid?: number;
  maxBid?: number;
}

// ==================== SEED GENERATION ====================

/**
 * Generate a cryptographically secure seed
 */
export const generateSecureSeed = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create a deterministic random number generator from seed
 */
export const createSeededRNG = (seed: string): (() => number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Linear congruential generator
  let state = Math.abs(hash);
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
};

// ==================== RANDOM STRATEGY ====================

/**
 * Select winner randomly with equal probability
 */
export const selectRandomWinner = (
  participants: ParticipantSnapshot[],
  config: StrategyConfig = {}
): SelectionResult => {
  const steps: SelectionStep[] = [];
  const seed = config.seed || generateSecureSeed();
  const rng = createSeededRNG(seed);
  const startTime = Date.now();

  // Step 1: Filter eligible participants
  const eligible = participants.filter(p => p.isEligible);
  steps.push({
    step: 1,
    description: `Filtered to ${eligible.length} eligible participants from ${participants.length} total`,
    value: eligible.length,
    timestamp: Date.now() - startTime,
  });

  if (eligible.length === 0) {
    throw new Error('No eligible participants for draw');
  }

  // Step 2: Generate random index
  const randomValue = rng();
  const winnerIndex = Math.floor(randomValue * eligible.length);
  steps.push({
    step: 2,
    description: `Generated random value: ${randomValue.toFixed(6)}, selected index: ${winnerIndex}`,
    value: randomValue,
    timestamp: Date.now() - startTime,
  });

  // Step 3: Select winner
  const winner = eligible[winnerIndex];
  steps.push({
    step: 3,
    description: `Selected winner: ${winner.memberName} (${winner.memberId})`,
    value: winner.memberId,
    timestamp: Date.now() - startTime,
  });

  return {
    winnerId: winner.memberId,
    winnerIndex,
    steps,
    seed,
    algorithm: 'random_uniform',
  };
};

// ==================== WEIGHTED STRATEGY ====================

/**
 * Select winner based on contribution weight
 * Higher contribution = higher probability
 */
export const selectWeightedWinner = (
  participants: ParticipantSnapshot[],
  config: StrategyConfig = {}
): SelectionResult => {
  const steps: SelectionStep[] = [];
  const seed = config.seed || generateSecureSeed();
  const rng = createSeededRNG(seed);
  const startTime = Date.now();

  // Step 1: Filter eligible participants
  const eligible = participants.filter(p => p.isEligible && p.weight > 0);
  steps.push({
    step: 1,
    description: `Filtered to ${eligible.length} eligible participants with positive weight`,
    value: eligible.length,
    timestamp: Date.now() - startTime,
  });

  if (eligible.length === 0) {
    throw new Error('No eligible participants with positive weight');
  }

  // Step 2: Calculate total weight
  const totalWeight = eligible.reduce((sum, p) => sum + p.weight, 0);
  steps.push({
    step: 2,
    description: `Total weight pool: ${totalWeight}`,
    value: totalWeight,
    timestamp: Date.now() - startTime,
  });

  // Step 3: Generate weighted random selection
  const randomValue = rng() * totalWeight;
  steps.push({
    step: 3,
    description: `Generated weighted random value: ${randomValue.toFixed(2)}`,
    value: randomValue,
    timestamp: Date.now() - startTime,
  });

  // Step 4: Find winner by accumulating weights
  let accumulated = 0;
  let winnerIndex = 0;
  for (let i = 0; i < eligible.length; i++) {
    accumulated += eligible[i].weight;
    if (randomValue <= accumulated) {
      winnerIndex = i;
      break;
    }
  }

  const winner = eligible[winnerIndex];
  steps.push({
    step: 4,
    description: `Selected winner: ${winner.memberName} with weight ${winner.weight} (${((winner.weight / totalWeight) * 100).toFixed(1)}% probability)`,
    value: winner.memberId,
    timestamp: Date.now() - startTime,
  });

  return {
    winnerId: winner.memberId,
    winnerIndex,
    steps,
    seed,
    algorithm: 'weighted_contribution',
  };
};

// ==================== BID-BASED STRATEGY ====================

export interface BidParticipant extends ParticipantSnapshot {
  bidAmount: number;
}

/**
 * Select winner based on highest bid (auction)
 */
export const selectBidWinner = (
  participants: BidParticipant[],
  config: StrategyConfig = {}
): SelectionResult => {
  const steps: SelectionStep[] = [];
  const seed = config.seed || 'bid_based_no_seed';
  const startTime = Date.now();

  // Step 1: Filter eligible participants with valid bids
  const eligible = participants.filter(p => {
    if (!p.isEligible) return false;
    if (p.bidAmount <= 0) return false;
    if (config.minBid && p.bidAmount < config.minBid) return false;
    if (config.maxBid && p.bidAmount > config.maxBid) return false;
    return true;
  });

  steps.push({
    step: 1,
    description: `Filtered to ${eligible.length} eligible bidders`,
    value: eligible.length,
    timestamp: Date.now() - startTime,
  });

  if (eligible.length === 0) {
    throw new Error('No eligible bidders for draw');
  }

  // Step 2: Sort by bid amount (highest first)
  eligible.sort((a, b) => b.bidAmount - a.bidAmount);
  steps.push({
    step: 2,
    description: `Sorted bidders by amount. Highest: ₹${eligible[0].bidAmount}, Lowest: ₹${eligible[eligible.length - 1].bidAmount}`,
    value: eligible[0].bidAmount,
    timestamp: Date.now() - startTime,
  });

  // Step 3: Select highest bidder
  const winner = eligible[0];
  steps.push({
    step: 3,
    description: `Selected winner: ${winner.memberName} with bid ₹${winner.bidAmount}`,
    value: winner.memberId,
    timestamp: Date.now() - startTime,
  });

  return {
    winnerId: winner.memberId,
    winnerIndex: 0,
    steps,
    seed,
    algorithm: 'highest_bid',
  };
};

// ==================== STRATEGY DISPATCHER ====================

export type StrategyType = 'random' | 'weighted' | 'bid';

/**
 * Execute the appropriate selection strategy
 */
export const executeStrategy = (
  strategy: StrategyType,
  participants: ParticipantSnapshot[] | BidParticipant[],
  config: StrategyConfig = {}
): SelectionResult => {
  switch (strategy) {
    case 'random':
      return selectRandomWinner(participants, config);
    case 'weighted':
      return selectWeightedWinner(participants, config);
    case 'bid':
      return selectBidWinner(participants as BidParticipant[], config);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
};

// ==================== REPLAY / VERIFICATION ====================

/**
 * Verify a draw result by replaying with the same seed
 */
export const verifyDrawResult = (
  strategy: StrategyType,
  participants: ParticipantSnapshot[],
  originalSeed: string,
  expectedWinnerId: string
): { verified: boolean; newResult: SelectionResult } => {
  const newResult = executeStrategy(strategy, participants, { seed: originalSeed });
  return {
    verified: newResult.winnerId === expectedWinnerId,
    newResult,
  };
};
