import { screen, waitFor } from '@testing-library/react-native';

import SharedPlanScreen from '../shared';
import { encodePlan } from '@/lib/planLink';
import { renderApp, useFakeStorage } from '@/test-utils';

beforeEach(() => {
  useFakeStorage();
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
});
