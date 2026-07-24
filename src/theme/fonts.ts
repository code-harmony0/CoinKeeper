/**
 * Global font system — Satoshi everywhere.
 *
 * Single source of truth for the app's only font family (Satoshi) and a
 * global render patch that guarantees EVERY <Text>/<TextInput> renders in
 * Satoshi — even the hundreds of legacy styles that only set `fontWeight`
 * (which would otherwise fall back to the OS system font, e.g. Roboto).
 *
 * See DESIGN.md §3. Android-only project; Satoshi OTFs live in
 * android/app/src/main/assets/fonts/ and bundle at build time.
 */
import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';

// The four bundled Satoshi cuts. These strings are the ONLY font families
// the app should ever reference.
export const FONTS = {
  regular: 'Satoshi-Regular', // body / secondary text        (400)
  medium: 'Satoshi-Medium', //  labels                        (500)
  bold: 'Satoshi-Bold', //      section titles, values, CTAs  (700)
  black: 'Satoshi-Black', //    page titles, hero numbers      (900)
} as const;

/**
 * Map any React Native fontWeight value onto the closest bundled Satoshi cut.
 * Satoshi has no 600 ("SemiBold"), so 600/700/bold all resolve to Satoshi-Bold
 * and 800/900 to Satoshi-Black — matching the weight remap documented in
 * DESIGN.md §3.
 */
export const weightToSatoshi = (weight?: string | number | null): string => {
  switch (String(weight ?? '400')) {
    case '500':
      return FONTS.medium;
    case '600':
    case '700':
    case 'bold':
      return FONTS.bold;
    case '800':
    case '900':
      return FONTS.black;
    default:
      // 100–400 + 'normal' + anything unexpected
      return FONTS.regular;
  }
};

let patched = false;

/**
 * Patch the RN Text + TextInput render so every instance is forced to Satoshi.
 * - Styles that already name a Satoshi family are left as-is.
 * - Everything else is mapped from its `fontWeight` to the right Satoshi cut.
 * - `fontWeight` is then cleared so Android doesn't *synthetically* bold an
 *   already-bold Satoshi file (which looks smeared).
 *
 * Call once, before AppRegistry, from index.js.
 */
export const setupGlobalFont = (): void => {
  if (patched) {
    return;
  }
  patched = true;

  const inject = (Component: any) => {
    if (!Component || typeof Component.render !== 'function') {
      return;
    }
    const originalRender = Component.render;
    Component.render = function patchedRender(...args: any[]) {
      const element = originalRender.apply(this, args);
      if (!element) {
        return element;
      }
      const flat = (StyleSheet.flatten(element.props.style) || {}) as {
        fontFamily?: string;
        fontWeight?: string | number;
      };
      const family =
        typeof flat.fontFamily === 'string' && flat.fontFamily.startsWith('Satoshi')
          ? flat.fontFamily
          : weightToSatoshi(flat.fontWeight);

      return React.cloneElement(element, {
        style: [flat, { fontFamily: family, fontWeight: undefined }],
      });
    };
  };

  inject(Text);
  inject(TextInput);
};
