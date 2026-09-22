import { getDb } from '../../store/database';

export interface SmsMiss {
  id: string;
  body: string;
  sender: string | null;
  receivedAt: number | null;
  loggedAt: number;
}

/**
 * Enough to judge whether a model is warranted, small enough that a table of
 * raw bank messages never becomes a liability sitting on the device.
 */
export const MISS_LOG_LIMIT = 200;

let counter = 0;
const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${counter++}`;

/**
 * Records bank messages that every parsing tier failed to read.
 *
 * This exists to answer one question with evidence instead of opinion: how
 * much of a real inbox do the rules actually miss? Rejected messages (OTPs,
 * declined payments) are not misses — those are correct refusals — so only
 * genuinely unrecognised formats land here.
 *
 * Nothing is uploaded. The user can read and delete the whole log.
 */
export const SmsMissLog = {
  async record(message: {
    id: string;
    body: string;
    sender?: string | null;
    receivedAt?: number | null;
  }): Promise<void> {
    if (!message.body?.trim()) return;

    const db = getDb();
    await db.execute(
      `INSERT OR IGNORE INTO sms_parse_misses (id, body, sender, received_at, logged_at)
       VALUES (?, ?, ?, ?, ?);`,
      [generateId(), message.body, message.sender ?? null, message.receivedAt ?? null, Date.now()],
    );
  },

  /**
   * Caps the log at MISS_LOG_LIMIT, oldest first, so it reflects the formats
   * the user's banks send now rather than two years ago.
   *
   * Called once at the end of an inbox scan, not per message: a deep scan
   * records hundreds of misses, and running this correlated subquery for each
   * one is what turned a scan into a visible stall on a real phone.
   */
  async trim(): Promise<void> {
    const db = getDb();
    await db.execute(
      `DELETE FROM sms_parse_misses
       WHERE id NOT IN (
         SELECT id FROM sms_parse_misses ORDER BY logged_at DESC LIMIT ?
       );`,
      [MISS_LOG_LIMIT],
    );
  },

  async list(): Promise<SmsMiss[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT id, body, sender, received_at, logged_at
       FROM sms_parse_misses
       ORDER BY logged_at DESC;`,
    );

    return ((result?.rows ?? []) as any[]).map(row => ({
      id: row.id,
      body: row.body,
      sender: row.sender ?? null,
      receivedAt: row.received_at ?? null,
      loggedAt: row.logged_at,
    }));
  },

  async count(): Promise<number> {
    const db = getDb();
    const result = await db.execute('SELECT COUNT(*) AS total FROM sms_parse_misses;');
    return (((result?.rows ?? []) as any[])[0]?.total ?? 0) as number;
  },

  async clear(): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM sms_parse_misses;');
  },
};
