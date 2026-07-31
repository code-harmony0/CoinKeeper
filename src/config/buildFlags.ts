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
