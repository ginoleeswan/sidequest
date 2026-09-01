import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { MobileTabBar } from '../MobileTabBar';
import { renderApp } from '@/test-utils';

declare global {
  var routePathname: string | undefined;
}

/**
 * The bar a phone gets on the web: the three roots native has, with the
 * current one marked and no navigation fired for the tab already open.
 */
describe('the mobile tab bar', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    globalThis.routePathname = '/library';
  });
  afterEach(() => {
    globalThis.routePathname = undefined;
  });

  it('offers the same three roots the native bar does', async () => {
    await renderApp(<MobileTabBar />);
    expect(screen.getByLabelText('Home')).toBeTruthy();
    expect(screen.getByLabelText('Library')).toBeTruthy();
    expect(screen.getByLabelText('Plan')).toBeTruthy();
  });

  it('marks the tab for the page you are on', async () => {
    await renderApp(<MobileTabBar />);
    expect(screen.getByLabelText('Library')).toBeSelected();
    expect(screen.getByLabelText('Home')).not.toBeSelected();
  });

  it('goes to another root, and stays put for the one already open', async () => {
    await renderApp(<MobileTabBar />);
    await fireEvent.press(screen.getByLabelText('Plan'));
    expect(router.push).toHaveBeenCalledWith('/plan');
    await fireEvent.press(screen.getByLabelText('Library'));
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
