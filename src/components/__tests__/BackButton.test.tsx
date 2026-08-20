import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BackButton } from '../BackButton';
import { renderApp } from '@/test-utils';

/**
 * A shared URL or a fresh tab has no history to pop, and a back button
 * that silently does nothing is worse than no back button.
 */
describe('the back button', () => {
  beforeEach(() => {
    jest.mocked(router.back).mockClear();
    jest.mocked(router.replace).mockClear();
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
