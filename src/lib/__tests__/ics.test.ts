import { buildIcs, memcardEvents, planEvents, type IcsEvent } from '../ics';
import type { LibraryEntry } from '../library';
import type { PlannedEvening } from '../week';

const NOW = new Date('2026-08-21T09:30:00Z');

const game = (id: number, name: string, playtime = 10) => ({
  id,
  name,
  playtime,
  background_image: null,
});

const finished = (
  id: number,
  name: string,
  finishedAt: number,
  playtime = 10
): LibraryEntry =>
  ({
    game: game(id, name, playtime),
    status: 'finished',
    addedAt: 1,
    finishedAt,
  }) as LibraryEntry;

const hoursOf = (g: { playtime?: number }) => g.playtime ?? 0;

/** Unfold continuation lines back into logical ones, as a reader would. */
const logical = (ics: string) =>
  ics.split('\r\n').join('\n').replace(/\n /g, '');

describe('buildIcs', () => {
  const event: IcsEvent = {
    uid: 'x@sidequest.app',
    start: new Date(2026, 7, 21, 20, 0),
    end: new Date(2026, 7, 21, 22, 0),
    title: 'Play',
  };

  it('wraps events in a valid calendar', () => {
    const ics = buildIcs([event], { name: 'Sidequest', now: NOW });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:Sidequest');
  });

  it('uses CRLF everywhere', () => {
    const ics = buildIcs([event], { name: 'Sidequest', now: NOW });
    // No bare newline: every LF must be preceded by a CR.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('stamps in UTC and starts in floating local time', () => {
    const ics = buildIcs([event], { name: 'Sidequest', now: NOW });
    expect(ics).toContain('DTSTAMP:20260821T093000Z');
    // Local wall clock, deliberately without a Z or a TZID.
    expect(ics).toContain('DTSTART:20260821T200000');
    expect(ics).not.toContain('DTSTART:20260821T200000Z');
  });

  it('ends an all-day event on the following day', () => {
    const ics = buildIcs(
      [
        {
          ...event,
          allDay: true,
          start: new Date(2026, 7, 21),
          end: new Date(2026, 7, 22),
        },
      ],
      { name: 'Sidequest', now: NOW }
    );
    expect(ics).toContain('DTSTART;VALUE=DATE:20260821');
    expect(ics).toContain('DTEND;VALUE=DATE:20260822');
  });

  it('escapes the characters that would break a line', () => {
    const ics = buildIcs(
      [{ ...event, title: 'Hey; you, there\\now', description: 'a\nb' }],
      { name: 'Sidequest', now: NOW }
    );
    expect(logical(ics)).toContain('SUMMARY:Hey\\; you\\, there\\\\now');
    expect(logical(ics)).toContain('DESCRIPTION:a\\nb');
  });

  it('folds long lines to 75 octets and keeps the content', () => {
    const title = 'A'.repeat(200);
    const ics = buildIcs([{ ...event, title }], {
      name: 'Sidequest',
      now: NOW,
    });
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(logical(ics)).toContain(`SUMMARY:${title}`);
  });

  it('folds multi-byte characters without splitting them', () => {
    const title = '🎮ゲーム'.repeat(30);
    const ics = buildIcs([{ ...event, title }], {
      name: 'Sidequest',
      now: NOW,
    });
    expect(ics).not.toContain('�');
    expect(logical(ics)).toContain(`SUMMARY:${title}`);
  });
});

describe('memcardEvents', () => {
  const entries = [
    finished(1, 'Portal', new Date(2026, 1, 3).getTime(), 4),
    finished(2, 'Hades', new Date(2026, 5, 9).getTime(), 22),
    finished(3, 'Last year', new Date(2025, 5, 9).getTime(), 9),
    {
      game: game(4, 'Unplayed'),
      status: 'wishlist',
      addedAt: 2,
    } as LibraryEntry,
  ];

  it('marks only games finished in the year asked for', () => {
    const events = memcardEvents(entries, hoursOf, 2026);
    expect(events.map((e) => e.title)).toEqual([
      '🏆 Finished Portal',
      '🏆 Finished Hades',
    ]);
  });

  it('marks them as all-day on the day it happened', () => {
    const [portal] = memcardEvents(entries, hoursOf, 2026);
    expect(portal.allDay).toBe(true);
    expect(portal.start.getMonth()).toBe(1);
    expect(portal.start.getDate()).toBe(3);
    expect(portal.end.getDate()).toBe(4);
  });

  it('gives every finish a uid that survives a re-import', () => {
    const first = memcardEvents(entries, hoursOf, 2026);
    const again = memcardEvents(entries, hoursOf, 2026);
    expect(first.map((e) => e.uid)).toEqual(again.map((e) => e.uid));
    expect(new Set(first.map((e) => e.uid)).size).toBe(first.length);
  });

  it('quotes the hours it knows and stays quiet when it does not', () => {
    const [portal] = memcardEvents(entries, hoursOf, 2026);
    expect(portal.description).toContain('4h');
    const [unknown] = memcardEvents(
      [finished(9, 'Mystery', new Date(2026, 0, 2).getTime(), 0)],
      hoursOf,
      2026
    );
    expect(unknown.description).toBe('One more off the pile. — Sidequest');
  });
});

describe('planEvents', () => {
  const evenings: PlannedEvening[] = [
    {
      date: new Date(2026, 7, 21).getTime(),
      weekday: 5,
      hours: 3,
      games: [
        { id: 1, name: 'Celeste', hours: 2, finishes: false },
        { id: 2, name: 'Portal', hours: 1, finishes: true },
      ],
    },
    {
      date: new Date(2026, 7, 22).getTime(),
      weekday: 6,
      hours: 3,
      games: [],
    },
  ];

  it('skips evenings with nothing in them', () => {
    expect(planEvents(evenings)).toHaveLength(1);
  });

  it('makes one sitting per evening, not one per game', () => {
    const [night] = planEvents(evenings);
    expect(night.title).toBe('🎮 Finish Portal');
    expect(night.description).toContain('Celeste');
    expect(night.description).toContain('Portal');
  });

  it('runs from the evening hour for as long as the games take', () => {
    const [night] = planEvents(evenings);
    expect(night.start.getHours()).toBe(20);
    expect(night.end.getHours()).toBe(23);
    expect(night.allDay).toBeFalsy();
  });

  it('names the evening after its games when nothing finishes', () => {
    const [night] = planEvents([
      {
        ...evenings[0],
        games: [{ id: 1, name: 'Celeste', hours: 2, finishes: false }],
      },
    ]);
    expect(night.title).toBe('🎮 Celeste');
  });

  it('honours a different evening hour', () => {
    const [night] = planEvents(evenings, { startHour: 9 });
    expect(night.start.getHours()).toBe(9);
  });
});
