import { DB } from '@op-engineering/op-sqlite';

/**
 * Bank messages that every parsing tier failed on.
 *
 * This is the evidence for whether an on-device model is worth its download:
 * without it, the choice between more regex, a community library, and a
 * fine-tuned model is guesswork. Stored locally only, shown to the user, and
 * deletable — a table of raw bank SMS is exactly the data this app promises
 * never to send anywhere.
 */
export const migrate017SmsParseMisses = async (db: DB): Promise<void> => {
  await db.transaction(async tx => {
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS sms_parse_misses (
        id TEXT PRIMARY KEY,
        body TEXT NOT NULL,
        sender TEXT,
        received_at INTEGER,
        logged_at INTEGER NOT NULL
      );
    `);

    // The same unparsed message reappears on every inbox scan; the digest
    // keeps one row per distinct message instead of one per sighting.
    await tx.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_parse_misses_body
        ON sms_parse_misses (body);
    `);
  });
};
