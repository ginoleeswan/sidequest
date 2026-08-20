import { fireEvent, screen } from '@testing-library/react-native';

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

function seed(rows: { game: Game; status: LibraryStatus }[]) {
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
    expect(screen.getByText('Celeste')).toBeTruthy();
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
});
