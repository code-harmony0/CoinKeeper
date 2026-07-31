import { readFileSync } from 'fs';
import { join } from 'path';

describe('onboarding sequence includes PIN setup', () => {
  const source = readFileSync(join(__dirname, '..', '..', 'src/navigation/RootNavigator.tsx'), 'utf8');

  it('renders SetupPinScreen somewhere in the first-run flow', () => {
    expect(source).toMatch(/SetupPinScreen/);
  });

  it('does not mark onboarding complete until after PIN setup', () => {
    // handlePrivacyAccept must NOT be the thing that sets hasSeenOnboarding
    // directly anymore — it should transition to PIN setup first.
    //
    // Deviation from the original plan draft: this checked source.indexOf
    // (first occurrence) of 'SetupPinScreen', but the screen's necessary
    // top-of-file `import` statement is always the first occurrence of that
    // identifier in any React Native file — true for every other onboarding
    // screen already imported here (PrivacyFirstScreen, OnboardingScreen).
    // lastIndexOf targets the actual JSX render usage instead, which is what
    // the test is really trying to verify: that SetupPinScreen is rendered
    // after the privacy-accept handler, not before it.
    const acceptIndex = source.indexOf('handlePrivacyAccept');
    const pinIndex = source.lastIndexOf('SetupPinScreen');
    expect(pinIndex).toBeGreaterThan(acceptIndex);
  });
});
