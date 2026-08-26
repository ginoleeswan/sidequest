import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import PlanScreen from '../(tabs)/plan';
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
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getAllByText('Celeste').length).toBeGreaterThan(0);
  });

  it('lets you correct a length from the plan itself', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByLabelText('Change how long Celeste takes')).toBeTruthy();
  });

  /**
   * Both dials show every option at once. They used to be single
   * controls that advanced on tap — six values behind one chip, no way
   * to see them and no way back — which is why the labels below name a
   * value rather than an instruction.
   */
  it('offers the pace and the deadline as things you can change', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByLabelText('Hours a week: 6h')).toBeTruthy();
    expect(screen.getByLabelText('Finish them: whenever')).toBeTruthy();
  });

  it('changes the pace in one tap, to the value you actually pressed', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    await fireEvent.press(screen.getByLabelText('Hours a week: 20h'));
    // Selected, not merely present — the control has to show which one.
    expect(
      screen.getByLabelText('Hours a week: 20h').props.accessibilityState
        .selected
    ).toBe(true);
  });

  it('is honest about what will not fit, rather than hiding it', async () => {
    seed([
      { game: game(1, 'Short', 4), status: 'wishlist' },
      { game: game(2, 'Enormous', 300), status: 'wishlist' },
    ]);
    await renderApp(<PlanScreen />);
    // 6h a week against a "whenever" window still drops a 300h game only
    // when a deadline exists, so pick one: two weeks.
    await fireEvent.press(screen.getByLabelText('Finish them: 2 weeks'));
    // One section for everything that doesn't fit — window overflow and
    // missed dates alike — where there used to be two, with the same
    // games in both.
    expect(screen.getByText('What doesn’t fit')).toBeTruthy();
    expect(screen.getByText('Enormous')).toBeTruthy();
    expect(screen.getByText(/more than the window has/)).toBeTruthy();
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
    await fireEvent.press(screen.getByLabelText('Hours a week: 20h'));
    await fireEvent.press(screen.getByLabelText('Finish them: 2 weeks'));
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
    // A one-line fact with its ways out beside it, not a paragraph:
    // the prose sentence belonged to the old warning cards.
    expect(screen.getByText(/room for about/)).toBeTruthy();
    expect(screen.getByText('Drop the date')).toBeTruthy();
    expect(screen.getByText('Let it go')).toBeTruthy();
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
    // The evenings are agenda rows; each one narrates itself.
    expect(screen.getAllByLabelText(/on Celeste/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^TONIGHT/).length).toBeGreaterThan(0);
  });

  /**
   * A long game eats the whole week, and seven cards all reading
   * "Grand Theft Aut…" is a worse way to say so than one line that does.
   */
  it('says the week is one game rather than repeating its name', async () => {
    seed([{ game: game(1, 'Grand Theft Auto V', 74), status: 'playing' }]);
    await renderApp(<PlanScreen />);
    // The agenda names a run of one game once — the other evenings
    // carry its colour and their own hours. Bare, the name appears
    // exactly twice, in two different sentences: the flag where its
    // credits land, and its stop on the route. Never seven cards.
    expect(screen.getAllByText('Grand Theft Auto V')).toHaveLength(2);
  });

  it('marks the evening the credits roll', async () => {
    seed([{ game: game(1, 'Short', 1), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getAllByLabelText(/the credits roll/).length).toBeGreaterThan(
      0
    );
  });

  /**
   * The month is the same schedule at horizon scale: a timeline with
   * today at one end and a flag where each game's credits land — never
   * a 30-box grid, whose empty boxes read as days you failed to fill.
   */
  it('shows the month as a horizon with the credits on it', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.getByText('This month')).toBeTruthy();
    expect(screen.getByText('TODAY')).toBeTruthy();
    expect(screen.getByLabelText(/Credits land: Celeste/)).toBeTruthy();
  });

  it('shows no week at all when there is nothing scheduled', async () => {
    seed([{ game: game(1, 'Unknown length', 0), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByText('This month')).toBeNull();
  });

  it('hands the plan over as a link that carries itself', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    await fireEvent.press(screen.getByLabelText('Copy a link to this plan'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const link = jest.mocked(Share.share).mock.calls[0][0].message as string;
    expect(link).toContain('/shared?p=');
    // Off a phone there is no document to read an origin from, and a
    // path on its own is not a link anybody can open.
    expect(link.startsWith('http')).toBe(true);
  });

  it('offers no link when there is no plan to share', async () => {
    seed([{ game: game(1, 'Unknown', 0), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByLabelText('Copy a link to this plan')).toBeNull();
  });
});

/**
 * A heading that says "This month" may not be followed by four hundred
 * rows spanning a decade.
 *
 * A 500-game library with no window put every scheduled game under it —
 * which is neither a month nor a plan, but the library again, sorted
 * differently, one tap from the screen that is better at exactly that.
 */
describe('a very large plan', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    game: game(i + 1, `Game ${i + 1}`, 4 + i),
    status: 'wishlist' as LibraryStatus,
  }));

  it('draws a readable route and says what is past it', async () => {
    seed(many);
    await renderApp(<PlanScreen />);
    expect(screen.getAllByText('on track').length).toBe(12);
    expect(screen.getByText(/28 more after these/)).toBeTruthy();
  });

  it('sends the reader to the screen that is a list', async () => {
    seed(many);
    await renderApp(<PlanScreen />);
    expect(screen.getByText(/See them all in your library/)).toBeTruthy();
  });

  it('says nothing extra when the whole route fits', async () => {
    seed(many.slice(0, 3));
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/more after these/)).toBeNull();
  });
});

/**
 * The pace the app watched, against the one it was told.
 *
 * Every date on this page rests on hours-a-week, chosen in ten seconds
 * during onboarding by somebody being generous with themselves — while
 * the session clock recorded real evenings the whole time and only the
 * Memcard ever looked.
 *
 * It is offered, never applied. A plan built on an optimistic pace
 * promises what the week cannot keep, and missing your own plan every
 * week is a far worse thing to feel than reading one honest sentence
 * about it — but the count is only of evenings somebody remembered to
 * time, so the app must not swap its own floor in for their judgement.
 */
describe('what the sessions know about your pace', () => {
  const DAY = 86_400_000;
  const sessions = (rows: { daysAgo: number; minutes: number }[]) =>
    JSON.stringify(
      rows.map(({ daysAgo, minutes }) => ({
        gameId: 1,
        minutes,
        endedAt: Date.now() - daysAgo * DAY,
      }))
    );

  /**
   * Twelve timed evenings of three hours across four weeks: nine hours
   * a week on the record, against the six the plan assumes. The floor
   * genuinely clears the assumption, which is the only case the app is
   * allowed to speak in.
   */
  const busy = Array.from({ length: 12 }, (_, i) => ({
    daysAgo: 28 - i * 2,
    minutes: 180,
  }));

  /** The caveat is the honest half: it counts what was timed, no more. */
  it('admits it only counted the evenings that were timed', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    store['sidequest.sessions.v1'] = sessions(busy);
    await renderApp(<PlanScreen />);
    await waitFor(() =>
      expect(screen.getByText(/only the evenings you timed/)).toBeTruthy()
    );
  });

  it('says nothing when no evenings have been timed', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/timed evenings/)).toBeNull();
  });

  it('says nothing on too little evidence to judge anybody by', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    store['sidequest.sessions.v1'] = sessions([
      { daysAgo: 3, minutes: 120 },
      { daysAgo: 1, minutes: 120 },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/timed evenings/)).toBeNull();
  });

  /**
   * The case it cannot speak to. An untimed evening looks exactly like
   * an evening that did not happen, so a low count is equally
   * consistent with somebody who plays every night and never presses
   * the button — and "use 1h a week" off four timed evenings would be
   * the app rewriting a stranger's life from the corner it saw.
   */
  it('stays quiet when the timed evenings are few, which proves nothing', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    store['sidequest.sessions.v1'] = sessions([
      { daysAgo: 28, minutes: 45 },
      { daysAgo: 20, minutes: 45 },
      { daysAgo: 12, minutes: 45 },
      { daysAgo: 4, minutes: 45 },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/timed evenings/)).toBeNull();
  });

  /** Upward it is on solid ground: those hours are on the record. */
  it('says so when there is provably more room than the plan thinks', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    store['sidequest.sessions.v1'] = sessions(busy);
    await renderApp(<PlanScreen />);
    await waitFor(() =>
      expect(
        screen.getByText(/holding back games you have room for/)
      ).toBeTruthy()
    );
  });

  it('offers the number rather than taking it', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    store['sidequest.sessions.v1'] = sessions(busy);
    await renderApp(<PlanScreen />);
    // The dial is untouched until somebody presses the offer.
    await waitFor(() =>
      expect(
        screen.getByLabelText('Hours a week: 6h').props.accessibilityState
          .selected
      ).toBe(true)
    );
    expect(screen.getByText(/Use \d+h a week/)).toBeTruthy();
  });
});

/**
 * What the verdict says when most of the shelf is outside the window.
 *
 * "N of these M" counts the failures and scales horribly: at four games
 * it is encouragement, at five hundred it reads "5 of these 500 will
 * get done" — an indictment of somebody's whole shelf, in the largest
 * sentence on a page whose doctrine is relief. Where a window is what
 * excluded them, the window is what the sentence names.
 */
describe('the verdict, when a window is doing the excluding', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    game: game(i + 1, `Game ${i + 1}`, 6 + i),
    status: 'wishlist' as LibraryStatus,
  }));

  it('names the window rather than counting the failures', async () => {
    seed(many);
    await renderApp(<PlanScreen />);
    await fireEvent.press(screen.getByLabelText('Finish them: 2 weeks'));
    await waitFor(() =>
      expect(
        screen.getAllByText(/2 weeks holds \d+ of them/).length
      ).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/of these 30 will get done/)).toBeNull();
  });

  /**
   * A plan with no window has none to blame — and "whenever" is itself
   * an option whose value is null, so a careless lookup found it and
   * said "whenever holds 5 of them".
   */
  it('never blames a window that was never set', async () => {
    seed([
      { game: game(1, 'Fits', 4), status: 'wishlist' as LibraryStatus },
      {
        game: game(2, 'Doomed', 400),
        status: 'wishlist' as LibraryStatus,
        deadline: Date.now() + 3 * 86_400_000,
      },
    ]);
    await renderApp(<PlanScreen />);
    expect(screen.queryByText(/whenever holds/)).toBeNull();
  });

  it('still celebrates a plan that fits entirely', async () => {
    seed([
      { game: game(1, 'Celeste', 4), status: 'wishlist' as LibraryStatus },
    ]);
    await renderApp(<PlanScreen />);
    await waitFor(() =>
      expect(
        screen.getAllByText(/You can finish it by/).length
      ).toBeGreaterThan(0)
    );
  });
});
