import { hoursLeft, planItems } from '../planning';
import { planSchedule } from '../scheduler';
import type { LibraryEntry, LibraryStatus } from '../library';
import type { Game } from '@/api/types';

/**
 * The one list both the plan screen and the widgets are built from.
 *
 * Most of what is pinned here is ordinary. The order is not: it is a
 * silent input to the schedule, and getting it wrong shows up as the
 * Lock Screen and the app quietly disagreeing about the same week.
 */

const NOW = new Date('2026-03-04T10:00:00').getTime();

const game = (id: number): Game =>
  ({ id, name: `Game ${id}`, slug: `game-${id}` }) as unknown as Game;

const entry = (
  id: number,
  status: LibraryStatus,
  over: Partial<LibraryEntry> = {}
): LibraryEntry => ({
  game: game(id),
  status,
  addedAt: NOW,
  updatedAt: NOW,
  ...over,
});

const tenHours = () => 10;

describe('planItems', () => {
  it('leaves finished games out', () => {
    const items = planItems(
      [entry(1, 'playing'), entry(2, 'finished')],
      tenHours
    );
    expect(items.map((item) => item.id)).toEqual([1]);
  });

  it('leaves out a game nobody knows the length of', () => {
    expect(planItems([entry(1, 'playing')], () => 0)).toEqual([]);
  });

  it('puts games already under way first', () => {
    // Not cosmetic. `planSchedule` sorts by deadline then by length and
    // the sort is stable, so two games matching on both keep their
    // arrival order — and which of them survives a full week is then
    // decided by nothing else.
    const items = planItems(
      [
        entry(1, 'wishlist'),
        entry(2, 'playing'),
        entry(3, 'wishlist'),
        entry(4, 'playing'),
      ],
      tenHours
    );
    expect(items.map((item) => item.id)).toEqual([2, 4, 1, 3]);
  });

  it('order changes the plan when nothing else separates two games', () => {
    // The proof the rule above earns its comment. Both wishlist, so
    // both count at full length; no deadlines, so the sort has nothing
    // to go on and falls back to arrival order. Only one of them fits
    // inside the window, and which one is decided here.
    const pair = [entry(1, 'wishlist'), entry(2, 'wishlist')];
    // Ten hours at five a week is a fortnight, so a sixteen-day window
    // has room for exactly one of them.
    const window = {
      hoursPerWeek: 5,
      now: NOW,
      deadline: NOW + 16 * 86_400_000,
    };
    const forwards = planSchedule(planItems(pair, tenHours), window);
    const backwards = planSchedule(
      planItems([...pair].reverse(), tenHours),
      window
    );
    // Which one survives is not the point — that it differs is. (It is
    // the later arrival: with one to drop, Moore–Hodgson evicts the
    // longest job seen so far, and between equals that is the first.)
    expect(forwards.scheduled.map((s) => s.id)).toEqual([2]);
    expect(backwards.scheduled.map((s) => s.id)).toEqual([1]);
  });

  it('a game under way outranks a wishlist game of the same length', () => {
    // Which is the whole reason the order is what it is.
    const pair = [
      entry(1, 'wishlist'),
      entry(2, 'playing', { hoursPlayed: 0 }),
    ];
    const items = planItems(pair, tenHours);
    expect(items[0].id).toBe(2);
  });

  it('carries the deadline and the must-play pin through', () => {
    const deadline = NOW + 5 * 86_400_000;
    const items = planItems(
      [entry(1, 'wishlist', { deadline, want: 3 })],
      tenHours
    );
    expect(items[0]).toMatchObject({ deadline, want: 3 });
  });

  it('treats an absent want as ordinary, not as a pin', () => {
    expect(planItems([entry(1, 'wishlist')], tenHours)[0].want).toBe(2);
  });
});

describe('hoursLeft', () => {
  it('halves a game under way that reports no played hours', () => {
    // The app's standing guess: started means roughly half done.
    expect(hoursLeft(entry(1, 'playing'), tenHours)).toBe(5);
  });

  it('uses the real number when there is one', () => {
    expect(hoursLeft(entry(1, 'playing', { hoursPlayed: 7 }), tenHours)).toBe(
      3
    );
  });

  it('counts a wishlist game at its full length', () => {
    expect(hoursLeft(entry(1, 'wishlist'), tenHours)).toBe(10);
  });

  it('never reports nothing left on something unfinished', () => {
    expect(hoursLeft(entry(1, 'playing', { hoursPlayed: 99 }), tenHours)).toBe(
      1
    );
  });
});
