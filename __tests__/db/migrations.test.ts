import {
  mapLegacyType,
  parseOccurredAt,
  toPaiseFromLegacyAmount,
  normalizeCategoryName,
} from '../../src/db/migrations/transform';

describe('migration transforms', () => {
  describe('mapLegacyType', () => {
    it('maps debit to expense and credit to income', () => {
      expect(mapLegacyType('debit')).toBe('expense');
      expect(mapLegacyType('credit')).toBe('income');
    });

    it('passes through the already-correct values', () => {
      expect(mapLegacyType('expense')).toBe('expense');
      expect(mapLegacyType('income')).toBe('income');
    });

    it('defaults unrecognized values to income rather than throwing', () => {
      expect(mapLegacyType('garbage')).toBe('income');
    });
  });

  describe('parseOccurredAt', () => {
    it('parses a valid ISO date string to unix ms', () => {
      expect(parseOccurredAt('2026-01-15T10:30:00.000Z')).toBe(Date.parse('2026-01-15T10:30:00.000Z'));
    });

    it('returns null for missing or garbage dates rather than defaulting to now', () => {
      expect(parseOccurredAt(null)).toBeNull();
      expect(parseOccurredAt(undefined)).toBeNull();
      expect(parseOccurredAt('not a date')).toBeNull();
      expect(parseOccurredAt('')).toBeNull();
    });
  });

  describe('toPaiseFromLegacyAmount', () => {
    it('converts a legacy REAL rupee amount to integer paise', () => {
      expect(toPaiseFromLegacyAmount(350)).toBe(35000);
      expect(toPaiseFromLegacyAmount(350.75)).toBe(35075);
    });

    it('rounds float drift the same way toPaise does', () => {
      expect(toPaiseFromLegacyAmount(1.05)).toBe(105);
    });

    it('rejects non-positive or non-finite legacy amounts instead of migrating bad data', () => {
      expect(toPaiseFromLegacyAmount(0)).toBeNull();
      expect(toPaiseFromLegacyAmount(-5)).toBeNull();
      expect(toPaiseFromLegacyAmount(NaN)).toBeNull();
      expect(toPaiseFromLegacyAmount(null)).toBeNull();
      expect(toPaiseFromLegacyAmount(undefined)).toBeNull();
    });
  });

  describe('normalizeCategoryName', () => {
    it('trims whitespace', () => {
      expect(normalizeCategoryName('  Food  ')).toBe('Food');
    });

    it('falls back to Other for empty or missing category names', () => {
      expect(normalizeCategoryName('')).toBe('Other');
      expect(normalizeCategoryName('   ')).toBe('Other');
      expect(normalizeCategoryName(null)).toBe('Other');
      expect(normalizeCategoryName(undefined)).toBe('Other');
    });
  });
});

/**
 * NOT COVERED HERE, on purpose: running 001_initial.ts / 002_finance.ts
 * against a real op-sqlite database and asserting on the resulting rows,
 * PRAGMA user_version, and the CHECK constraints actually rejecting bad
 * inserts. op-sqlite is a native JSI module — its published "node" build
 * target (node/dist/index.js) throws ERR_MODULE_NOT_FOUND on a broken
 * internal import in this installed version, and even if that were fixed,
 * its own source explicitly says "Encryption is not supported in the
 * Node.js implementation" — moot here since 1.3 doesn't need encryption,
 * but the module resolution failure alone blocks using it under Jest at
 * all. Verifying the actual migration (v1 fixture -> v2, real data merge,
 * real CHECK constraint enforcement) needs a device/emulator run against a
 * compiled build. Tracked as an open manual step in docs/APP_FLOW_PLAN.md,
 * same as Task 1.2's wrong-key-throws test.
 */
