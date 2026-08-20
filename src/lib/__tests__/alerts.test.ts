import type { Game } from '@/api/types';
import { buildAlerts } from '../alerts';
import type { LibraryEntry } from '../library';

const NOW = Date.UTC(2026, 5, 1);
const DAY = 24 * 60 * 60 * 1000;

const entry = (
  over: Partial<LibraryEntry> & { id: number; name: string; hours: number }
): LibraryEntry => ({
  game: { id: over.id, name: over.name, playtime: over.hours } as Game,
  status: over.status ?? 'wishlist',
  addedAt: NOW,
  hoursPlayed: over.hoursPlayed,
  deadline: over.deadline,
});

const hoursOf = (e: LibraryEntry) => e.game.playtime ?? 0;

/**
 * These are the only things the app says unprompted, so each has to be
 * worth saying — and the ones about a date that cannot be met have to
 * offer a way out rather than a telling-off.
 */
describe('what to say when the app opens', () => {
  it('says nothing when there is nothing to say', () => {
    expect(
      buildAlerts(
        [entry({ id: 1, name: 'Someday', hours: 40 })],
        hoursOf,
        6,
        NOW
      )
    ).toEqual([]);
  });

  it('warns when a date cannot be met, and offers both ways out', () => {
    const alerts = buildAlerts(
      [
        entry({
          id: 1,
          name: 'Epic',
          hours: 60,
          deadline: NOW + 7 * DAY,
        }),
      ],
      hoursOf,
      6,
      NOW
    );
    expect(alerts[0].kind).toBe('at-risk');
    expect(alerts[0].message).toMatch(/Move the date, or let it go/);
  });

  it('reassures when a date can be met', () => {
    const alerts = buildAlerts(
      [entry({ id: 1, name: 'Short', hours: 5, deadline: NOW + 14 * DAY })],
      hoursOf,
      6,
      NOW
    );
    expect(alerts[0].kind).toBe('due-soon');
    expect(alerts[0].message).toMatch(/due in 14 days/);
    expect(alerts[0].message).toMatch(/That fits/);
  });

  it('counts the hours already played towards the date', () => {
    const alerts = buildAlerts(
      [
        entry({
          id: 1,
          name: 'Nearly',
          hours: 40,
          hoursPlayed: 38,
          status: 'playing',
          deadline: NOW + 7 * DAY,
        }),
      ],
      hoursOf,
      6,
      NOW
    );
    // Two hours left against six of capacity: that fits, and would not
    // have without the measurement.
    expect(alerts[0].kind).toBe('due-soon');
  });

  it('points out a game an evening from its credits', () => {
    const alerts = buildAlerts(
      [
        entry({
          id: 1,
          name: 'Almost',
          hours: 20,
          hoursPlayed: 19,
          status: 'playing',
        }),
      ],
      hoursOf,
      6,
      NOW
    );
    expect(alerts[0].kind).toBe('nearly-done');
    expect(alerts[0].message).toMatch(/one evening/);
  });

  it('does not nag about a short game nobody has started', () => {
    const alerts = buildAlerts(
      [entry({ id: 1, name: 'Tiny', hours: 2 })],
      hoursOf,
      6,
      NOW
    );
    expect(alerts).toEqual([]);
  });

  it('leaves finished games alone', () => {
    expect(
      buildAlerts(
        [
          entry({
            id: 1,
            name: 'Done',
            hours: 5,
            status: 'finished',
            deadline: NOW + DAY,
          }),
        ],
        hoursOf,
        6,
        NOW
      )
    ).toEqual([]);
  });

  it('says nothing about a date that is months away', () => {
    expect(
      buildAlerts(
        [entry({ id: 1, name: 'Later', hours: 5, deadline: NOW + 200 * DAY })],
        hoursOf,
        6,
        NOW
      )
    ).toEqual([]);
  });

  it('handles a date that has already passed without pretending it has not', () => {
    const alerts = buildAlerts(
      [entry({ id: 1, name: 'Overdue', hours: 5, deadline: NOW - 3 * DAY })],
      hoursOf,
      6,
      NOW
    );
    expect(alerts[0].kind).toBe('at-risk');
    expect(alerts[0].message).toMatch(/past the date you set/);
  });

  it('leads with the one where doing nothing is wrong', () => {
    const alerts = buildAlerts(
      [
        entry({ id: 1, name: 'Fits', hours: 4, deadline: NOW + 10 * DAY }),
        entry({ id: 2, name: 'Cannot', hours: 90, deadline: NOW + 10 * DAY }),
      ],
      hoursOf,
      6,
      NOW
    );
    expect(alerts.map((a) => a.kind)).toEqual(['at-risk', 'due-soon']);
  });

  it('keeps quiet rather than listing everything', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      entry({
        id: i + 1,
        name: `Game ${i}`,
        hours: 4,
        deadline: NOW + (i + 1) * DAY,
      })
    );
    expect(buildAlerts(many, hoursOf, 40, NOW)).toHaveLength(3);
  });
});
