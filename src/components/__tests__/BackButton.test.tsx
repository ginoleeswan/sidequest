import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { BackButton } from '../BackButton';
import { renderApp } from '@/test-utils';

/**
 * A shared URL or a fresh tab has no history to pop, and a back button
 * that silently does nothing is worse than no back button.
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
    Platform.OS = 'web';
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
