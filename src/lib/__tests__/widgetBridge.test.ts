import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { publishArt, publishPlan, clearWidgets, KINDS } from '../widgetBridge';
import type { PlanDay } from '../widgetData';

/**
 * The bridge's design invariant is atomicity-by-JSON-string and
 * remove-rather-than-write-empty: a widget woken mid-update must see
 * the whole new plan or the whole old one, and an empty plan must show
 * the widget's own empty state, never a card for a game called "".
 * These tests pin exactly that contract against a fake store.
 */
const mockSet = jest.fn();
const mockRemove = jest.fn();
const mockReload = jest.fn();

jest.mock('../widgetStore', () => ({
  widgetStore: () => ({
    store: { set: mockSet, remove: mockRemove },
    reload: (kind: string) => mockReload(kind),
  }),
}));

const morning = (title: string): PlanDay => ({
  at: new Date('2026-08-28T00:00:00').getTime(),
  tonight: { id: 1, title, hours: 2, finishes: false },
  nights: [
    {
      day: 'FRI',
      date: 28,
      title,
      hours: 2,
      finishes: false,
      colour: 0,
      named: true,
    },
  ],
  horizon: null,
  pressure: { urgency: 'calm', note: '1 game · 2 days', days: null },
});

beforeEach(() => jest.clearAllMocks());

describe('the widget bridge', () => {
  it('removes the plan rather than writing an empty one', async () => {
    await publishPlan([]);
    expect(mockRemove).toHaveBeenCalledWith('plan');
    expect(mockSet).not.toHaveBeenCalledWith('plan', expect.anything());
  });

  it('writes the whole week as one JSON string', async () => {
    // Atomicity: a widget woken mid-update sees the whole new plan or
    // the whole old one. Seven days in one string is the guarantee.
    await publishPlan([morning('Hades'), morning('Pragmata')]);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, value] = mockSet.mock.calls[0];
    expect(key).toBe('plan');
    expect(JSON.parse(value)).toHaveLength(2);
  });

  it('writes each key as one whole JSON string', async () => {
    await publishPlan([morning('Hades')]);
    for (const [, value] of mockSet.mock.calls) {
      // Decodable whole, or the half-written-widget guarantee is gone.
      expect(() => JSON.parse(value)).not.toThrow();
    }
  });

  it('knocks after writing, for every widget drawn from the plan', async () => {
    await publishPlan([morning('Hades')]);
    expect(mockReload).toHaveBeenCalledWith('Tonight');
    expect(mockReload).toHaveBeenCalledWith('ThisWeek');
    // The month reads the same key and was correct on paper for a
    // while; it simply was never told, so it went on showing whatever
    // it last rendered until iOS chose to ask again.
    expect(mockReload).toHaveBeenCalledWith('ThisMonth');
  });

  /**
   * Removing the data is only half of forgetting.
   *
   * A widget holds a rendered timeline of its own, so one that is never
   * told to reload goes on displaying a plan whose source has been
   * deleted — the app's delete-means-delete promise broken on the most
   * public screen the reader has. This counted three for a while, and
   * kept counting three after a fourth widget shipped, which is how the
   * gap survived: the number was the assertion.
   */
  it('clearWidgets forgets every key and wakes every widget', async () => {
    await clearWidgets();
    expect(mockRemove.mock.calls.map(([k]) => k).sort()).toEqual([
      'art',
      'covers',
      'plan',
      'tonight',
      'week',
      'year',
    ]);
    const woken = mockReload.mock.calls.map(([k]) => k).sort();
    expect(woken).toEqual([...Object.values(KINDS)].sort());
  });
});

/**
 * The two languages agree on what the widgets are called.
 *
 * `KINDS` is a hand-written copy of strings that live in Swift, and a
 * copy is a thing that falls behind. This one did: a fourth widget
 * shipped and nothing on this side learned its name, so it was never
 * told a new plan had arrived and — the part that matters — never told
 * to stop showing an old one after somebody deleted their library.
 *
 * Reading the Swift is the only check that could have caught it, since
 * both consequences are invisible from JavaScript. It is cheap: four
 * files, one regular expression, and a build failure the day somebody
 * adds a fifth widget and forgets this table.
 */
describe('the widget kinds, against the Swift that declares them', () => {
  const widgetsDir = join(__dirname, '..', '..', '..', 'targets', 'widgets');

  const declared = readdirSync(widgetsDir)
    .filter((name) => name.endsWith('.swift'))
    .flatMap((name) =>
      Array.from(
        readFileSync(join(widgetsDir, name), 'utf8').matchAll(
          /StaticConfiguration\(\s*kind:\s*"([^"]+)"/g
        ),
        (match) => match[1]
      )
    );

  it('finds the widgets at all, so an empty match cannot pass', () => {
    expect(declared.length).toBeGreaterThan(0);
  });

  it('knows the name of every widget the app ships', () => {
    expect(declared.sort()).toEqual([...Object.values(KINDS)].sort());
  });
});

describe('the artwork, which travels separately from the plan', () => {
  const manifest = {
    '12': { hero: 'hero-12-abc.jpg', logo: 'logo-12-def.png' },
  };

  it('writes the manifest under its own key, as one string', async () => {
    await publishArt(manifest);
    expect(mockSet).toHaveBeenCalledWith('art', JSON.stringify(manifest));
  });

  it('removes it rather than writing an empty object', async () => {
    await publishArt({});
    expect(mockRemove).toHaveBeenCalledWith('art');
    expect(mockSet).not.toHaveBeenCalledWith('art', expect.anything());
  });

  /**
   * Every widget draws something from the manifest now — the hero and
   * the logo on Tonight, the icons on the week and the month, the boxes
   * on the year — so every one is told when the pictures land.
   */
  it('wakes every widget, since every one draws from it', async () => {
    await publishArt(manifest);
    const woken = mockReload.mock.calls.map(([k]) => k).sort();
    expect(woken).toEqual([...Object.values(KINDS)].sort());
  });

  /**
   * Art outliving its plan is the widget contradicting itself: key art
   * behind the words "no plan yet".
   */
  it('drops the art when the plan empties', async () => {
    await publishPlan([]);
    expect(mockRemove).toHaveBeenCalledWith('art');
  });
});
