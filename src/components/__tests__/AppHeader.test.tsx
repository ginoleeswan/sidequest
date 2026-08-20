import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AppHeader } from '../AppHeader';
import { renderApp } from '@/test-utils';

/** Desktop chrome: navigation always one click away. */
describe('the app header', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('carries the three places the app goes', async () => {
    await renderApp(<AppHeader />);
    for (const label of ['Home', 'My Library', 'The Plan']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('navigates from the wordmark and from the links', async () => {
    await renderApp(<AppHeader />);
    await fireEvent.press(screen.getByLabelText('Sidequest home'));
    expect(router.push).toHaveBeenCalledWith('/');
    await fireEvent.press(screen.getByText('The Plan'));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });

  it('marks the page you are on', async () => {
    (globalThis as { routePathname?: string }).routePathname = '/library';
    await renderApp(<AppHeader />);
    const active = screen.getByText('My Library').props.style;
    const other = screen.getByText('Home').props.style;
    expect(JSON.stringify(active)).not.toBe(JSON.stringify(other));
    delete (globalThis as { routePathname?: string }).routePathname;
  });
});
