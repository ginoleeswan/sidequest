import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SharedPlanScreen from '../shared';
import { encodePlan } from '@/lib/planLink';
import { renderApp, useFakeStorage } from '@/test-utils';

beforeEach(() => {
  useFakeStorage();
  jest.mocked(router.push).mockClear();
});
afterAll(() => {
  delete (globalThis as { routeParams?: unknown }).routeParams;
});

const open = (p?: string) => {
  (globalThis as { routeParams?: unknown }).routeParams = p ? { p } : {};
};

/**
 * Somebody else's plan, read out of the URL. No account, no server, no
 * copy of anyone's library — which is the only reason it can be shared
 * at all.
 */
describe('a shared plan', () => {
  it('reads the plan out of the link', async () => {
    open(
      encodePlan({
        pace: 6,
        games: [
          { name: 'Celeste', hours: 12 },
          { name: 'Hades II', hours: 21.5 },
        ],
      })
    );
    await renderApp(<SharedPlanScreen />);
    await waitFor(() => expect(screen.getByText('Celeste')).toBeTruthy());
    expect(screen.getByText('Hades II')).toBeTruthy();
    expect(
      screen.getByText('2 games · 34 hours · about 6 weeks at 6h a week')
    ).toBeTruthy();
  });

  it('says so plainly when the link carries no plan', async () => {
    open('rubbish');
    await renderApp(<SharedPlanScreen />);
    await waitFor(() =>
      expect(screen.getByText('That link has no plan in it')).toBeTruthy()
    );
  });

  it('says so when there is no link at all', async () => {
    open();
    await renderApp(<SharedPlanScreen />);
    await waitFor(() =>
      expect(screen.getByText('That link has no plan in it')).toBeTruthy()
    );
  });

  it('makes the promise explicit', async () => {
    open(encodePlan({ pace: 4, games: [{ name: 'Tunic', hours: 12 }] }));
    await renderApp(<SharedPlanScreen />);
    await waitFor(() =>
      expect(screen.getByText(/this plan lives in the link/)).toBeTruthy()
    );
  });

  it('gives the reader a way to build one', async () => {
    // The copy has invited them to since this screen shipped. This is
    // the only screen a stranger reaches by being given something, so
    // it is the one place the app has earned the right to ask — and
    // for a long time the branch that FAILED to read a link converted
    // while this one, the link a friend actually sends, did not.
    open(encodePlan({ pace: 4, games: [{ name: 'Tunic', hours: 12 }] }));
    await renderApp(<SharedPlanScreen />);
    await waitFor(() =>
      expect(screen.getByText('Build your own')).toBeTruthy()
    );
    fireEvent.press(screen.getByText('Build your own'));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });

  it('still offers the way out when the link is broken', async () => {
    open('not-a-plan');
    await renderApp(<SharedPlanScreen />);
    await waitFor(() => expect(screen.getByText('Make your own')).toBeTruthy());
  });
});
