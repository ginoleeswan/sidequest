import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { RouteError } from '../RouteError';
import { reportCrash } from '@/lib/reportCrash';
import { renderApp } from '@/test-utils';

jest.mock('@/lib/reportCrash', () => ({ reportCrash: jest.fn() }));

/**
 * What a route shows when its render throws. It has to keep the failure
 * inside the route, offer the two things that help, and tell us it
 * happened.
 */
describe('the route error screen', () => {
  const error = new Error('kaboom');
  beforeEach(() => {
    jest.mocked(reportCrash).mockClear();
    jest.mocked(router.replace).mockClear();
  });

  it('reassures rather than blaming, and reports the crash', async () => {
    await renderApp(<RouteError error={error} retry={jest.fn()} />);
    expect(screen.getByText('This screen hit a snag')).toBeTruthy();
    expect(reportCrash).toHaveBeenCalledWith(error);
  });

  it('retries in place', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    await renderApp(<RouteError error={error} retry={retry} />);
    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('replaces rather than pushes on the way home — the bad route should not come back', async () => {
    await renderApp(<RouteError error={error} retry={jest.fn()} />);
    await fireEvent.press(screen.getByText('Go home'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
