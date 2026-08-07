export type FinancialEvent = 'invalidate';

type EventCallback = () => void;

class EventBus {
  private listeners: Set<EventCallback> = new Set();

  /**
   * Subscribe to financial mutations. Returns an unsubscribe function.
   */
  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Broadcast that the SQLite financial ledger has mutated.
   * This forces all caches (Money Plan, Dashboard, Transactions) to refetch.
   */
  emit() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('[EventBus] Error in listener:', e);
      }
    });
  }
}

export const financialEventBus = new EventBus();
