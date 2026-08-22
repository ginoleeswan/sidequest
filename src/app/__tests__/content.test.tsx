import { screen } from '@testing-library/react-native';

import AboutScreen from '../about';
import NotFoundScreen from '../+not-found';
import PrivacyScreen from '../privacy';
import TermsScreen from '../terms';
import { renderApp } from '@/test-utils';

/**
 * The pages nobody visits until they need them — and the one nobody
 * means to. Cheap to break, and each carries a promise the app has to
 * keep.
 */
/**
 * The about screen is deliberately the heaviest render in the app —
 * the deck, the wall, the constellation, the build — and on a loaded
 * machine its mount can brush jest's 20-second default. The budget is
 * explicit so a slow run reads as slow, not flaky.
 */
const HEAVY = 45_000;

describe('the static pages', () => {
  /**
   * The page a stranger lands on. It has to make the case, so what is
   * pinned is the case rather than a heading — the promise, the sum
   * behind it, and a way in.
   */
  it(
    'makes the case to somebody who has not used it',
    async () => {
      await renderApp(<AboutScreen />);
      // Twice over: the masthead, and the footer's tagline under it.
      expect(
        screen.getAllByText('Know which games you can actually finish.').length
      ).toBeGreaterThan(0);
      // The standfirst has to name the mechanism in plain words: this is
      // the line that decides whether a stranger understands the product.
      expect(screen.getByText(/knows how long games take/)).toBeTruthy();
      // Not the sum: that section is deferred until it is near the
      // viewport, so in a test it is still its placeholder.
      // By label, not by text: the page's claims are set a word at a
      // time, so each one is a Text per word behind a single accessible
      // label. Querying the label is both the accurate way to ask and the
      // thing worth pinning — if the line ever stops announcing as one
      // sentence, that is a regression whoever uses a screen reader will
      // notice first.
      expect(
        screen.getByLabelText('It knows how long things take.')
      ).toBeTruthy();
      // The CTA states the outcome, not the mechanism. Pinned because
      // "Open Sidequest" is the sort of label that creeps back in: it is
      // the obvious thing to write and the one thing a reader who has
      // not used this yet gains nothing from being told.
      expect(
        screen.getAllByText('Find what I can finish').length
      ).toBeGreaterThan(0);
    },
    HEAVY
  );

  it(
    'is honest about what it does not take',
    async () => {
      await renderApp(<AboutScreen />);
      expect(screen.getByLabelText('No account. No tracking.')).toBeTruthy();
    },
    HEAVY
  );

  it('states the terms', async () => {
    await renderApp(<TermsScreen />);
    expect(screen.getByText('Terms of Use')).toBeTruthy();
  });

  it('keeps the privacy promise the rest of the app makes', async () => {
    await renderApp(<PrivacyScreen />);
    // Twice: the page title, and the footer link back to it.
    expect(screen.getAllByText('Privacy').length).toBeGreaterThan(0);
    // The library living on the device is the claim made everywhere else.
    expect(screen.getAllByText(/device/i).length).toBeGreaterThan(0);
  });

  it('offers a way out of a URL that does not exist', async () => {
    await renderApp(<NotFoundScreen />);
    expect(screen.getByText("This screen doesn't exist")).toBeTruthy();
    expect(screen.getByText('Go back home')).toBeTruthy();
  });
});
