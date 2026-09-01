import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { BackButton } from '../BackButton';
import { renderApp } from '@/test-utils';

/**
 * The corner control wears two faces on web. A browser tab already has
 * the platform's own back, so the corner offers the front door instead:
 * the brand lockup, going Home. Installed to a home screen there is no
 * browser chrome, and the chevron returns as the only way backwards.
 */
describe('the back button', () => {
  /**
   * This control is the WEB one. On native the Stack draws a real
   * navigation bar and this renders nothing, so the tests below have to
   * ask for the platform that still uses it.
   */
  const ORIGINAL = Platform.OS;
  beforeAll(() => {
    Platform.OS = 'web';
  });
  afterAll(() => {
    Platform.OS = ORIGINAL;
  });

  beforeEach(() => {
    jest.mocked(router.back).mockClear();
    jest.mocked(router.replace).mockClear();
  });

  it('leaves the chevron to the platform where there is a navigation bar', async () => {
    Platform.OS = ORIGINAL;
    await renderApp(<BackButton />);
    expect(screen.queryByLabelText('Go back')).toBeNull();
    expect(screen.queryByLabelText('Go to the Sidequest home page')).toBeNull();
    Platform.OS = 'web';
  });

  it('offers the front door in a browser tab, not a second back button', async () => {
    await renderApp(<BackButton />);
    expect(screen.queryByLabelText('Go back')).toBeNull();
    await fireEvent.press(
      screen.getByLabelText('Go to the Sidequest home page')
    );
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });

  /**
   * The chevron only exists installed to a home screen, so these tests
   * hand the component a window whose display-mode claims standalone.
   */
  describe('installed, where the chevron is the only way backwards', () => {
    const holder = globalThis as unknown as {
      window?: { matchMedia?: (q: string) => { matches: boolean } };
    };
    let hadWindow: boolean;
    let priorWindow: (typeof holder)['window'];

    beforeEach(() => {
      hadWindow = 'window' in holder;
      priorWindow = holder.window;
      holder.window = {
        ...(typeof priorWindow === 'object' ? priorWindow : {}),
        matchMedia: () => ({ matches: true }),
      };
    });
    afterEach(() => {
      if (hadWindow) holder.window = priorWindow;
      else delete holder.window;
    });

    it('goes back when there is somewhere to go back to', async () => {
      jest.mocked(router.canGoBack).mockReturnValue(true);
      await renderApp(<BackButton />);
      await fireEvent.press(screen.getByLabelText('Go back'));
      expect(router.back).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('goes home from a deep link, which has no history', async () => {
      jest.mocked(router.canGoBack).mockReturnValue(false);
      await renderApp(<BackButton />);
      await fireEvent.press(screen.getByLabelText('Go back'));
      expect(router.replace).toHaveBeenCalledWith('/');
      expect(router.back).not.toHaveBeenCalled();
      jest.mocked(router.canGoBack).mockReturnValue(true);
    });
  });
});
