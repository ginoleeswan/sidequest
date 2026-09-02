import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SharedPlanScreen, { sharedSchedule } from '../(pages)/shared';
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
 * Somebody else's plan, read out of the URL and drawn as a plan. No
 * account, no server, no copy of anyone's library — which is the only
 * reason it can be shared at all.
 *
 * It used to render a numbered list of names and hours, which is the
 * one thing this app is not: a backlog. The link carries the games and
 * the pace, and those are the only two inputs the engine ever needed,
 * so the friend who opens it gets the real thing — the week of
 * evenings and the horizon of credits, off the same components.
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
    // Named in the week it fills, on the flag where its credits land,
    // and on its stop in the route — the same three places the plan
    // page names a game.
    await waitFor(() =>
      expect(screen.getAllByText('Celeste').length).toBeGreaterThan(0)
    );
    expect(screen.getAllByText('Hades II').length).toBeGreaterThan(0);
    expect(
      screen.getByText('2 games · 34 hours · about 6 weeks at 6h a week')
    ).toBeTruthy();
  });

  /**
   * The point of the whole screen: a friend sees the app's answer, not
   * a list they could have written in a text message.
   */
  it('draws the week and the month, not a list of names', async () => {
    open(
      encodePlan({
        pace: 8,
        games: [
          { name: 'Celeste', hours: 12 },
          { name: 'Tunic', hours: 12 },
        ],
      })
    );
    await renderApp(<SharedPlanScreen />);
    await waitFor(() => expect(screen.getByText('The week')).toBeTruthy());
    expect(screen.getByText('The month')).toBeTruthy();
    // The evenings narrate themselves, and the horizon names its
    // landings — the same components the plan page uses.
    expect(screen.getAllByLabelText(/on Celeste/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Credits land: Celeste/)).toBeTruthy();
  });

  /**
   * A friend's Thursday is not an appointment you have. The week draws
   * the same seven evenings and keeps the calendar hand-off out of it.
   */
  it('does not offer to put somebody else’s week in your calendar', async () => {
    open(encodePlan({ pace: 8, games: [{ name: 'Celeste', hours: 12 }] }));
    await renderApp(<SharedPlanScreen />);
    await waitFor(() => expect(screen.getByText('The week')).toBeTruthy());
    expect(screen.queryByText(/Put this week in my calendar/)).toBeNull();
  });

  /**
   * The link carries games and a pace. It does not carry a "now", so
   * every date on this page is the reader's own — and the page says so
   * rather than presenting invented dates as somebody's promise.
   */
  it('admits the dates are drawn from today', async () => {
    open(encodePlan({ pace: 8, games: [{ name: 'Celeste', hours: 12 }] }));
    await renderApp(<SharedPlanScreen />);
    await waitFor(() =>
      expect(screen.getByText(/not the dates — so this is drawn/)).toBeTruthy()
    );
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

/**
 * The engine, run back over what the link could carry. The rows arrive
 * already in schedule order — the sender encoded `schedule.scheduled` —
 * so this recovers the landing dates rather than deciding anything.
 */
describe('recovering a shared schedule', () => {
  const NOW = new Date(2026, 7, 17, 18).getTime();

  it('keeps the order the sender sent', () => {
    const out = sharedSchedule(
      {
        pace: 10,
        games: [
          { name: 'First', hours: 10 },
          { name: 'Second', hours: 20 },
        ],
      },
      NOW
    );
    expect(out.map((item) => item.name)).toEqual(['First', 'Second']);
  });

  it('works out when each one’s credits roll, at their pace', () => {
    const [first, second] = sharedSchedule(
      {
        pace: 10,
        games: [
          { name: 'First', hours: 10 },
          { name: 'Second', hours: 10 },
        ],
      },
      NOW
    );
    // Ten hours at ten a week is a week; twenty is two.
    expect(Math.round((first.finishAt - NOW) / 86_400_000)).toBe(7);
    expect(Math.round((second.finishAt - NOW) / 86_400_000)).toBe(14);
  });
});
