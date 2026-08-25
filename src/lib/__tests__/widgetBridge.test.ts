import { publishPlan, clearWidgets } from '../widgetBridge';
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
  tonight: { title, hours: 2, finishes: false },
  nights: [{ day: 'FRI', title, hours: 2, finishes: false }],
  pressure: { urgency: 'calm', note: '1 game · 2 days' },
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

  it('knocks after writing, for every widget it touched', async () => {
    await publishPlan([morning('Hades')]);
    expect(mockReload).toHaveBeenCalledWith('Tonight');
    expect(mockReload).toHaveBeenCalledWith('ThisWeek');
  });

  it('clearWidgets forgets all three and wakes all three', async () => {
    await clearWidgets();
    expect(mockRemove.mock.calls.map(([k]) => k).sort()).toEqual([
      'plan',
      'tonight',
      'week',
      'year',
    ]);
    expect(mockReload).toHaveBeenCalledTimes(3);
  });
});
