/**
 * Compile-time module flags.
 *
 * `CK_CHITFUND` is replaced with a literal by
 * babel-plugin-transform-inline-environment-variables (see babel.config.js),
 * so `CHITFUND_ENABLED` collapses to `true`/`false` at build time and Metro's
 * minifier eliminates the dead branches entirely. That is what keeps
 * src/modules/chitfund out of the lite bundle — a runtime boolean would not.
 *
 * Never reference these behind a function call or re-export them through a
 * dynamic barrel; dead-code elimination only fires on the direct constant.
 */
export const CHITFUND_ENABLED: boolean = process.env.CK_CHITFUND === '1';

/** Kaza (missed-prayer) tracker. Flavor-independent — ships in both builds. */
export const ISLAMIC_ENABLED: boolean = true;

/**
 * The PIN lock — the unlock gate on cold start and the PIN step in onboarding.
 *
 * Off in development, because a PIN prompt between every reload is friction
 * with no payoff on a machine that already belongs to the developer. `__DEV__`
 * is a React Native global that Metro replaces with `false` in release builds,
 * so this cannot ship enabled by accident — a debug convenience must never
 * become a shipped security hole.
 *
 * A device that already has a PIN keeps it; this only skips *asking*. Flip it
 * to `true` locally when you need to work on the lock flow itself.
 */
export const APP_LOCK_ENABLED: boolean = !__DEV__;

/**
 * FLAG_SECURE on money screens — blocks screenshots and screen recording.
 *
 * Off in development for the same reason as the lock: with it on, every
 * `adb screencap` of a balance screen returns solid black, so nobody can
 * review a design change or file a bug with a screenshot. `__DEV__` is
 * replaced with `false` in release builds, so the protection is always on in
 * anything a user installs.
 */
export const SECURE_SCREEN_ENABLED: boolean = !__DEV__;
