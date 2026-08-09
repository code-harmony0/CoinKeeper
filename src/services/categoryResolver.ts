/**
 * Category resolution ladder.
 *
 * Before this existed, categorization relied entirely on learned merchant
 * history, so a new user typing "food" got no match even though a Food
 * category was already seeded — and the save path fell through to a
 * fabricated "unknown" category. This resolves what can be resolved from the
 * text alone, and returns null rather than guessing when it cannot.
 *
 * Pure module: no database, no store imports. Callers pass the user's real
 * category list so a keyword never resolves to a category they don't have.
 */

export const UNKNOWN = 'unknown';

export type ResolveReason = 'name' | 'keyword' | 'fuzzy';

export interface CategoryMatch {
  categoryId: string;
  reason: ResolveReason;
}

export interface ResolvableCategory {
  id: string;
  name: string;
}

/**
 * Merchant tokens → the category NAME they belong to. India-first because
 * this app is INR-only. Bundled data: no network, no API key, no model.
 * Resolved back to an id from the caller's list, so an entry whose category
 * the user doesn't have is simply skipped.
 */
const KEYWORD_SEED: Record<string, string> = {
  // Food
  swiggy: 'Food', zomato: 'Food', blinkit: 'Food', zepto: 'Food',
  dominos: 'Food', mcdonalds: 'Food', kfc: 'Food', starbucks: 'Food',
  bigbasket: 'Food', instamart: 'Food', dunzo: 'Food', cafe: 'Food',
  restaurant: 'Food', grocery: 'Food', kirana: 'Food',
  // Transport
  uber: 'Transport', ola: 'Transport', rapido: 'Transport', irctc: 'Transport',
  indigo: 'Transport', vistara: 'Transport', redbus: 'Transport',
  petrol: 'Transport', diesel: 'Transport', fuel: 'Transport',
  metro: 'Transport', fastag: 'Transport', parking: 'Transport',
  // Shopping
  amazon: 'Shopping', flipkart: 'Shopping', myntra: 'Shopping',
  meesho: 'Shopping', ajio: 'Shopping', nykaa: 'Shopping', ikea: 'Shopping',
  decathlon: 'Shopping',
  // Bills
  jio: 'Bills', airtel: 'Bills', vodafone: 'Bills', bsnl: 'Bills',
  electricity: 'Bills', bescom: 'Bills', broadband: 'Bills', recharge: 'Bills',
  gas: 'Bills', water: 'Bills', rent: 'Bills', insurance: 'Bills',
  // Health
  apollo: 'Health', pharmeasy: 'Health', netmeds: 'Health', '1mg': 'Health',
  pharmacy: 'Health', hospital: 'Health', clinic: 'Health', medical: 'Health',
  // Entertainment
  netflix: 'Entertainment', spotify: 'Entertainment', hotstar: 'Entertainment',
  prime: 'Entertainment', bookmyshow: 'Entertainment', pvr: 'Entertainment',
  // Education
  udemy: 'Education', coursera: 'Education', byjus: 'Education',
  unacademy: 'Education', tuition: 'Education', school: 'Education',
};

const normalize = (s: string): string => s.trim().toLowerCase();

const isUnknown = (name: string): boolean => normalize(name) === UNKNOWN;

/** Levenshtein distance, iterative two-row form. */
const distance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }

  return prev[b.length];
};

export const resolveCategory = (
  merchant: string,
  categories: ResolvableCategory[],
): CategoryMatch | null => {
  const text = normalize(merchant ?? '');
  if (!text) return null;

  // The unknown bucket is never a resolution target — treating it as one is
  // what let a single mislabel train the learning model to repeat itself.
  const usable = categories.filter(c => c.name && !isUnknown(c.name));
  if (usable.length === 0) return null;

  const byName = new Map(usable.map(c => [normalize(c.name), c.id]));
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);

  // Rung 1 — the merchant IS a category name, exactly or as a whole word.
  const exact = byName.get(text);
  if (exact) return { categoryId: exact, reason: 'name' };

  for (const token of tokens) {
    const hit = byName.get(token);
    if (hit) return { categoryId: hit, reason: 'name' };
  }

  // Rung 2 — a known merchant keyword, mapped back to a category the user has.
  for (const token of tokens) {
    const targetName = KEYWORD_SEED[token];
    if (!targetName) continue;
    const id = byName.get(normalize(targetName));
    if (id) return { categoryId: id, reason: 'keyword' };
  }

  // Rung 3 — bounded fuzzy match, so "shoping" reaches Shopping but noise
  // reaches nothing. Requires an unambiguous single best candidate.
  const candidates: { id: string; d: number }[] = [];

  for (const token of [text, ...tokens]) {
    const budget = Math.max(1, Math.floor(token.length / 4));

    for (const [name, id] of byName) {
      const d = distance(token, name);
      if (d <= budget) candidates.push({ id, d });
    }

    for (const [keyword, targetName] of Object.entries(KEYWORD_SEED)) {
      const id = byName.get(normalize(targetName));
      if (!id) continue;
      const d = distance(token, keyword);
      if (d <= budget) candidates.push({ id, d });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.d - b.d);
  const best = candidates[0];
  const tiedOnDifferentCategory = candidates.some(
    c => c.d === best.d && c.id !== best.id,
  );
  if (tiedOnDifferentCategory) return null;

  return { categoryId: best.id, reason: 'fuzzy' };
};
