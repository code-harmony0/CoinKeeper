module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Replaces process.env.CK_CHITFUND with a string literal at build time, so
    // CHITFUND_ENABLED in src/config/buildFlags.ts collapses to a constant and
    // Metro's minifier eliminates every guarded require(). Without this the
    // flag would be a runtime boolean and the chit-fund code would still ship.
    ['transform-inline-environment-variables', { include: ['CK_CHITFUND'] }],
    // Metro collects require() dependencies at transform time, before any
    // minification — so an `if (false) { require(...) }` branch would still be
    // resolved and pull the module back into the graph. This strips the dead
    // branch during the Babel pass, so Metro never sees the require at all.
    // It must run after the inline-env plugin has turned the flag into a literal.
    'minify-dead-code-elimination',
    // Must remain last.
    ['react-native-reanimated/plugin', {
      relativeSourceLocation: true,
    }],
  ],
};
