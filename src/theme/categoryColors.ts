/**
 * Category inks — and, more importantly, where colour is allowed to mean
 * something and where it is not.
 *
 * ## What went wrong before
 *
 * The hero drew its category bars from the app's five-colour pastel accent
 * rotation (DESIGN.md §2). On the light canvas that rotation is the system;
 * inside the dark hero it put a pink bar between a green "you're fine" ring
 * and an amber warning — a colour carrying no meaning sitting between two that
 * do. That reads as a bug because it is one: decoration wearing the costume of
 * an encoding.
 *
 * ## What the validator found
 *
 * The obvious fix — give every category its own hue — does not survive
 * checking. Run against the dark panel surface with `--pairs all` (any two
 * categories can land beside each other in a ranked list), no five-hue or even
 * four-hue categorical palette inside the dark-mode lightness band
 * (OKLCH L 0.48–0.67) clears the normal-vision separation floor of ΔE 15. Best
 * five-slot result from a 220-sample search was ΔE 6.5 under deuteranopia and
 * 12.7 with full colour vision — a hard fail. Equal-lightness hue wheels do
 * worse still: deuteranopia collapses the red–green axis, so red and green at
 * matched lightness become the same colour.
 *
 * That is the encoding telling you it is wrong, so:
 *
 * ## The rule
 *
 * **A ranked list of categories gets ONE ink.** Every row already carries its
 * own name and its own amount; identity is in the text, magnitude is in the
 * bar length, and a hue per row would be a third encoding of information
 * already stated twice. This is the standard treatment for nominal categories,
 * and it is why `barInk` takes no category at all.
 *
 * **The transit map keeps distinct route colours**, because there colour is
 * doing real work: a line is traced across a diagram away from its label, so
 * the eye needs to follow a stroke. Even there colour is the *third* channel
 * behind fixed spoke position (N/NE/E/SE/S) and a direct text label with the
 * amount, and only one route is ever highlighted at a time — the rest sit at
 * 0.28 opacity — so a reader is never asked to discriminate five hues at once.
 */

export interface CategoryInk {
  /** The stroke or fill. */
  fill: string;
  /** A track or ground in the same hue at 15%. */
  track: string;
}

const ink = (hex: string): CategoryInk => ({
  fill: hex,
  track: `${hex}26`,
});

/**
 * Route inks for the transit map only. Named rather than positional so a
 * category keeps its colour when a bigger one appears above it — a reader who
 * learned "Food is orange" must not be repainted by a filter.
 */
const ROUTES: Record<string, CategoryInk> = {
  food: ink('#FF9500'),
  groceries: ink('#FF9500'),
  unknown: ink('#5AC8FA'),
  uncategorized: ink('#5AC8FA'),
  transport: ink('#0A84FF'),
  travel: ink('#0A84FF'),
  entertainment: ink('#BF5AF2'),
  shopping: ink('#FF375F'),
  bills: ink('#64D2FF'),
  utilities: ink('#64D2FF'),
  health: ink('#30D158'),
  rent: ink('#FFD60A'),
};

/** Fallback ramp, keyed by name so a category's colour is stable. */
const FALLBACK: CategoryInk[] = [
  ink('#5E5CE6'),
  ink('#FF9F0A'),
  ink('#66D4CF'),
  ink('#AC8E68'),
  ink('#FF6482'),
];

const hashName = (name: string): number => {
  let h = 0;
  // Modulo keeps this in safe-integer range without bitwise ops; the value
  // only has to be stable, not cryptographic.
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 1000003;
  }
  return h;
};

/**
 * The ink for one route on the transit map.
 *
 * Do not reach for this to colour a list. If you are rendering rows that each
 * carry their own label, you want `barInk` — see the rule at the top of this
 * file.
 */
export const categoryInk = (name: string): CategoryInk => {
  const key = name.trim().toLowerCase();
  return ROUTES[key] ?? FALLBACK[hashName(key) % FALLBACK.length];
};

/**
 * The single ink for a ranked bar list.
 *
 * Takes no category on purpose: every row in such a list is labelled, so the
 * bar's only job is length. Pass the panel's current tone colour so the
 * breakdown belongs to the same story the status line and plan bar are telling.
 */
export const barInk = (toneColor: string): CategoryInk => ink(toneColor);
