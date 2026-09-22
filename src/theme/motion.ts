/**
 * Motion policy — the one place that decides how this app moves, and the one
 * place that decides what "reduce motion" actually suppresses.
 *
 * ## Why this file exists
 *
 * Every animation in the app used to carry `ReduceMotion.System`. That reads as
 * conscientious and is in fact a bug: when the OS reports reduce-motion, that
 * flag makes Reanimated skip the animation and jump straight to the end value.
 * Applied to everything, it means the entire app has no motion — no gauge
 * drawing, no bar filling, no number counting — for anyone whose device
 * reports the flag.
 *
 * On Android that flag is not a considered accessibility declaration. React
 * Native derives it from the system animation-scale setting, which people
 * (developers especially) switch off to make a phone feel faster. "I turned
 * off window transitions" and "motion makes me ill" are not the same request,
 * and one blanket constant cannot serve both.
 *
 * ## The two classes
 *
 * **Expressive** motion is decoration: scaling, translation, rotation,
 * parallax, looping pulses, shimmer. It is what vestibular disorders react to,
 * and suppressing it costs the user nothing but delight. It honours the system
 * flag.
 *
 * **Informational** motion *is* the content: an arc drawing to its value, a bar
 * filling to its percentage, a figure counting to its total. The movement is
 * how the quantity is communicated. Suppressing it doesn't calm the screen — it
 * deletes information and leaves a static chart that never says how it got
 * there. It always plays, but shortens sharply under reduce-motion so it reads
 * as a fast settle rather than a performance.
 *
 * This split is what WCAG 2.3.3 already draws: it targets non-essential motion
 * triggered by interaction, and explicitly exempts motion essential to
 * conveying information.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';

/**
 * For decoration — scale, translate, rotate, parallax, loops, shimmer.
 * Suppressed entirely when the system asks for reduced motion.
 */
export const EXPRESSIVE = ReduceMotion.System;

/**
 * For motion that carries the number — arcs, bars, count-ups.
 * Always plays; use `useReducedMotion()` to shorten it instead of killing it.
 */
export const INFORMATIONAL = ReduceMotion.Never;

/**
 * Durations, in ms. Micro-interactions stay at or under 400ms; entrances run
 * 400–600ms. Anything longer is a loop, and loops are always expressive.
 */
export const DURATION = {
  /** Press, toggle, colour change. */
  micro: 200,
  /** A control settling, a row expanding. */
  quick: 300,
  /** A card arriving. */
  entrance: 400,
  /** A bar filling. */
  fill: 600,
  /** A hero figure counting. */
  count: 800,
  /** A line drawing itself. */
  draw: 1000,
  /** One pass of a highlight travelling across a surface. */
  shimmer: 1400,
  /** One half-cycle of the calm breathing glow. */
  breatheCalm: 1500,
  /** One half-cycle of the alert breathing glow. */
  breatheAlert: 750,
} as const;

/** Spring presets. `press` is the spec's mass 1 / stiffness 400 / damping 25. */
export const SPRING = {
  /** Touch feedback — fast, barely any overshoot. */
  press: { mass: 1, stiffness: 400, damping: 25 },
  /** Release — a little overshoot so the surface feels physical. */
  release: { mass: 1, stiffness: 320, damping: 16 },
  /** An arc or bar settling on a value. */
  settle: { mass: 1, stiffness: 90, damping: 18 },
  /** A card arriving. */
  entrance: { mass: 1, stiffness: 140, damping: 16 },
} as const;

/** Stagger between siblings, in ms. */
export const STAGGER = {
  tight: 50,
  normal: 80,
  loose: 100,
} as const;

/**
 * The home screen's entrance choreography, as absolute offsets in ms from the
 * moment the screen mounts.
 *
 * It lives here as data rather than as delays scattered through six components
 * so the sequence can be read — and corrected — in one place. A choreography
 * spread across the files it animates is one nobody can see.
 */
export const HOME_SEQUENCE = {
  card: 0,
  /** The dial fills. One gauge, one slot — the old outer/middle/inner
      staggering belonged to a triple ring that no longer exists. */
  ring: 300,
  heroCount: 900,
  heroLabel: 1000,
  storyRow: 1100,
  statusLine: 1200,
  kpiPills: 1300,
  planBar: 1400,
  breakdown: 1500,
} as const;

/**
 * Live system reduce-motion preference.
 *
 * Subscribes to changes, so toggling the OS setting takes effect without a
 * restart. Use it to shorten informational motion — never to skip it.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) setReduced(value);
      })
      .catch(() => {
        // An unavailable accessibility bridge must never mean "assume the user
        // wants motion suppressed" — that is the failure this file exists to
        // prevent. Default to motion on.
        if (alive) setReduced(false);
      });

    // Defensive on both ends. This hook is called from CountUp, which renders
    // inside almost every card in the app — if it can throw, it can take down
    // an unrelated screen. Some environments (and the Jest RN preset) return
    // nothing from addEventListener, so an unguarded `sub.remove()` in cleanup
    // crashed the tree on unmount.
    let sub: { remove?: () => void } | undefined;
    try {
      sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value =>
        setReduced(value),
      ) as { remove?: () => void } | undefined;
    } catch {
      sub = undefined;
    }

    return () => {
      alive = false;
      try {
        sub?.remove?.();
      } catch {
        // A listener that cannot be removed must not break unmounting.
      }
    };
  }, []);

  return reduced;
};

/**
 * Scales an informational duration for the current preference. Reduced motion
 * gets a quarter of the time — visible enough to show the value arriving,
 * short enough not to be a performance.
 */
export const informationalDuration = (ms: number, reduced: boolean): number =>
  reduced ? Math.round(ms * 0.25) : ms;

/**
 * Scales a choreography offset. Under reduced motion the whole sequence
 * compresses rather than replaying at full length in fast-forward.
 */
export const sequenceDelay = (ms: number, reduced: boolean): number =>
  reduced ? Math.round(ms * 0.2) : ms;
