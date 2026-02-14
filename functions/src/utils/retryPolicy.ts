/**
 * Retry Policy Utility
 * Exponential backoff with jitter for reliable external calls
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

/**
 * Calculate delay for the next retry attempt
 */
export const calculateRetryDelay = (
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number => {
  if (attemptNumber <= 0) return 0;
  if (attemptNumber >= config.maxAttempts) return -1;

  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  const jitter = Math.random() * config.jitterFactor * delay;

  return Math.min(delay + jitter, config.maxDelayMs);
};

/**
 * Check if we should retry based on attempt count
 */
export const shouldRetry = (
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean => {
  return attemptNumber < config.maxAttempts;
};

/**
 * Calculate next retry timestamp
 */
export const getNextRetryTime = (
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date | null => {
  const delay = calculateRetryDelay(attemptNumber, config);
  if (delay < 0) return null;
  return new Date(Date.now() + delay);
};

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry wrapper for async operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= config.maxAttempts) {
        break;
      }

      const delayMs = calculateRetryDelay(attempt, config);
      if (delayMs > 0) {
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
};

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('econnreset')) {
      return true;
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return true;
    }

    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Transient errors
    if (message.includes('temporarily unavailable') || message.includes('try again')) {
      return true;
    }
  }

  return false;
};

/**
 * Conditional retry wrapper that only retries for retryable errors
 */
export const withConditionalRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry if error is retryable
      if (!isRetryableError(lastError) || attempt >= config.maxAttempts) {
        break;
      }

      const delayMs = calculateRetryDelay(attempt, config);
      if (delayMs > 0) {
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('Operation failed');
};
