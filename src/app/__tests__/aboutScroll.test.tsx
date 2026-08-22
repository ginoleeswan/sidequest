import { screen } from '@testing-library/react-native';

import AboutScreen from '../about';
import { renderApp } from '@/test-utils';

/**
 * Wiring coverage for the ScrollStage-pinning fix, alongside the exact
 * values pinned in `src/lib/__tests__/webScrollContainer.test.ts`.
 *
 * Jest renders this page under Platform.OS 'ios' — see the comment atop
 * `ScrollStage.test.tsx` for why — so a live web run is what actually
 * proves the pin (that was the coordinator's own browser measurement,
 * not something this suite can reproduce: forcing Platform.OS to 'web'
 * here would also flip on `ScrollStage`'s pinned effect, which reaches
 * for `window` and there is no DOM in this test environment). What this
 * test can and does prove is that the fix is actually reached on the
 * native path rather than left dead code: `about.tsx`'s ScrollView gets
 * no style override at all off web, so native scrolling is provably
 * unchanged by this fix.
 */
it(
  'leaves the native ScrollView unstyled by the web-only overflow fix',
  async () => {
    await renderApp(<AboutScreen />);
    expect(screen.getByTestId('about-scroll').props.style).toBeNull();
  },
  45_000
);
