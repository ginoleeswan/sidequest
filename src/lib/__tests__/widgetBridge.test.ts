import { publishPlan, clearWidgets } from '../widgetBridge';
import type { PlannedEvening } from '../week';

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

const evening = (title: string): PlannedEvening => ({
  date: new Date('2026-08-28T00:00:00').getTime(),
  weekday: 5,
  hours: 1.5,
  games: [{ id: 1, name: title, hours: 1.5, finishes: false }],
});

beforeEach(() => jest.clearAllMocks());

describe('the widget bridge', () => {
  it('removes tonight rather than writing an empty card', async () => {
    await publishPlan([]);
    expect(mockRemove).toHaveBeenCalledWith('tonight');
    // The week key is still written whole — an empty week is a real
    // answer the widget renders as its own empty state.
    expect(mockSet).toHaveBeenCalledWith('week', expect.any(String));
    expect(mockSet).not.toHaveBeenCalledWith('tonight', expect.anything());
  });

  it('writes each key as one whole JSON string', async () => {
    await publishPlan([evening('Hades')]);
    for (const [, value] of mockSet.mock.calls) {
      // Decodable whole, or the half-written-widget guarantee is gone.
      expect(() => JSON.parse(value)).not.toThrow();
    }
  });

  it('knocks after writing, for every widget it touched', async () => {
    await publishPlan([evening('Hades')]);
    expect(mockReload).toHaveBeenCalledWith('Tonight');
    expect(mockReload).toHaveBeenCalledWith('ThisWeek');
  });

  it('clearWidgets forgets all three and wakes all three', async () => {
    await clearWidgets();
    expect(mockRemove.mock.calls.map(([k]) => k).sort()).toEqual([
      'tonight',
      'week',
      'year',
    ]);
    expect(mockReload).toHaveBeenCalledTimes(3);
  });
});
