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
describe('the static pages', () => {
  it('says what the app is', async () => {
    await renderApp(<AboutScreen />);
    expect(screen.getByText('About')).toBeTruthy();
  });

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
