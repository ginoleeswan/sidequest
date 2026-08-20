import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import PlanScreen from '../plan';
import type { Game } from '@/api/types';
import type { LibraryStatus } from '@/lib/library';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const game = (id: number, name: string, playtime: number) =>
  ({ id, name, playtime, released: '2020-01-01' }) as Game;

function seed(
  rows: {
    game: Game;
    status: LibraryStatus;
    hoursPlayed?: number;
    want?: number;
    deadline?: number;
  }[]
) {
  store['sidequest.library.v1'] = JSON.stringify(
    Object.fromEntries(
      rows.map((r, i) => [String(r.game.id), { addedAt: i + 1, ...r }])
    )
  );
}

/**
 * The plan is the product's answer to "what can I actually finish".
 * These pin the states it can be in, not the arithmetic — the scheduler
 * itself is covered separately in lib/__tests__/scheduler.
 */
describe('the plan screen', () => {
  it('explains itself when there is nothing to plan', async () => {
    await renderApp(<PlanScreen />);
    expect(screen.getByText('Nothing to plan yet')).toBeTruthy();
  });

  it('ignores finished games — a plan is about what is left', async () => {
    seed([{ game: game(1, 'Done', 8), status: 'finished' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText('Nothing to plan yet')).toBeTruthy();
  });

  it('plans what you saved', async () => {
    seed([
      { game: game(1, 'Celeste', 12), status: 'wishlist' },
      { game: game(2, 'Hades II', 30), status: 'playing' },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText('Your route')).toBeTruthy();
    // Once in the week, once in the route.
    expect(screen.getAllByText('Celeste').length).toBeGreaterThan(0);
  });

  it('lets you correct a length from the plan itself', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByLabelText('Change how long Celeste takes')).toBeTruthy();
  });

  it('offers the pace and the deadline as things you can change', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(
      screen.getByLabelText('Hours per week: 6h. Tap to change.')
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Finish window: whenever. Tap to change.')
    ).toBeTruthy();
  });

  it('cycles the pace on each tap, so the sentence stays a sentence', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    await fireEvent.press(
      screen.getByLabelText('Hours per week: 6h. Tap to change.')
    );
    expect(
      screen.getByLabelText('Hours per week: 8h. Tap to change.')
    ).toBeTruthy();
  });

  it('is honest about what will not fit, rather than hiding it', async () => {
    seed([
      { game: game(1, 'Short', 4), status: 'wishlist' },
      { game: game(2, 'Enormous', 300), status: 'wishlist' },
    ]);
    await renderApp(<PlanScreen />);
    // 6h a week against a "whenever" window still drops a 300h game only
    // when a deadline exists, so pick one: two weeks.
    await fireEvent.press(
      screen.getByLabelText('Finish window: whenever. Tap to change.')
    );
    expect(screen.getByText('Side quests — for later')).toBeTruthy();
    expect(screen.getByText('Enormous')).toBeTruthy();
  });

  it('asks for the lengths nobody has reported', async () => {
    seed([{ game: game(1, 'Obscure', 0), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText('Length unknown')).toBeTruthy();
    expect(screen.getByText('Set how long it takes →')).toBeTruthy();
  });

  /**
   * The point of importing from Steam: a game 30 hours into its 40 is an
   * evening away from done, and the plan should say so rather than
   * assuming everything under way is half finished.
   */
  it('counts what is left when it knows the hours, not half of everything', async () => {
    seed([
      { game: game(1, 'Deep In', 40), status: 'playing', hoursPlayed: 34 },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText(/6h left of 40h/)).toBeTruthy();
  });

  it('falls back to half for a game under way it cannot measure', async () => {
    seed([{ game: game(1, 'Unmeasured', 40), status: 'playing' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getAllByText(/20h/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/left of/)).toBeNull();
  });

  /**
   * A pin is the player overruling the engine. The plan has to honour it
   * and then be honest about the price, which is the product's whole
   * voice in one line.
   */
  it('keeps a game you insisted on, and says what it cost', async () => {
    seed([
      { game: game(1, 'Epic', 40), status: 'wishlist', want: 3 },
      { game: game(2, 'Short A', 6), status: 'wishlist' },
      { game: game(3, 'Short B', 6), status: 'wishlist' },
    ]);
    await renderApp(<PlanScreen />);
    // 20h a week for two weeks is exactly 40 hours: room for the game
    // that was insisted on, or for both short ones, but not both.
    for (const pace of ['6h', '8h', '12h']) {
      await fireEvent.press(
        screen.getByLabelText(`Hours per week: ${pace}. Tap to change.`)
      );
    }
    await fireEvent.press(
      screen.getByLabelText('Finish window: whenever. Tap to change.')
    );
    expect(screen.getByText(/costs you/)).toBeTruthy();
  });

  it('says nothing about pins when nothing is pinned', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/costs you/)).toBeNull();
  });

  it('says the thing it would have sent you, when there is one', async () => {
    seed([
      {
        game: game(1, 'Pentiment', 40),
        status: 'wishlist',
        deadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
      },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText(/Move the date, or let it go/)).toBeTruthy();
  });

  /**
   * "Done by 4 Sep" is an ordering; "Tonight 1.5h, Tomorrow 1.5h" is a
   * plan. The week is the same schedule, spread across the evenings
   * somebody actually has.
   */
  it('spreads the plan across the evenings you have', async () => {
    seed([{ game: game(1, 'Celeste', 6), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText('This week')).toBeTruthy();
    // "Tonight" is also the heading on the tonight card above it.
    expect(screen.getAllByText('Tonight').length).toBeGreaterThan(1);
    expect(screen.getByText('Tomorrow')).toBeTruthy();
  });

  it('marks the evening the credits roll', async () => {
    seed([{ game: game(1, 'Short', 1), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getAllByText(/credits/).length).toBeGreaterThan(0);
  });

  it('shows no week at all when there is nothing scheduled', async () => {
    seed([{ game: game(1, 'Unknown length', 0), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText('This week')).toBeNull();
  });

  it('hands the plan over as a link that carries itself', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText } },
    });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    await fireEvent.press(screen.getByLabelText('Copy a link to this plan'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('/shared?p=');
  });

  it('offers no link when there is no plan to share', async () => {
    seed([{ game: game(1, 'Unknown', 0), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByLabelText('Copy a link to this plan')).toBeNull();
  });
});
