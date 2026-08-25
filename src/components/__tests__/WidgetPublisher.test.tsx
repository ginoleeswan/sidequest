import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';

import { WidgetPublisher } from '../WidgetPublisher';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';

/**
 * When the widgets are told, and — the part that costs something if it
 * is wrong — how often.
 *
 * iOS meters widget reloads. PRODUCT.md §6 makes a point of the
 * timeline sidestepping that budget, which it does not do if the app
 * spends the budget itself: tidying a shelf is a burst of library
 * writes, and each one would otherwise be a write to the app group and
 * two reloads.
 */

const mockPublishPlan = jest.fn();
const mockPublishYear = jest.fn();
jest.mock('@/lib/widgetBridge', () => ({
  publishPlan: (days: unknown) => mockPublishPlan(days),
  publishYear: (card: unknown) => mockPublishYear(card),
  clearWidgets: jest.fn(),
}));

// playtime matters: a game nobody knows the length of cannot be
// scheduled, so a library of them publishes an empty plan — correct,
// and useless for testing anything past that.
const game = (id: number): Game =>
  ({
    id,
    name: `Game ${id}`,
    slug: `game-${id}`,
    playtime: 10,
  }) as unknown as Game;

const grabbed: { library: ReturnType<typeof useLibrary> | null } = {
  library: null,
};
function Grab() {
  const library = useLibrary();
  // Written in an effect, not during render: assigning outside the
  // component while rendering is the side effect the compiler exists
  // to catch.
  useEffect(() => {
    grabbed.library = library;
  });
  return null;
}

const mount = () =>
  render(
    <LibraryProvider>
      <DurationsProvider>
        <Grab />
        <WidgetPublisher />
      </DurationsProvider>
    </LibraryProvider>
  );

const settle = async () => {
  await act(async () => {
    jest.advanceTimersByTime(3_000);
  });
};

beforeEach(() => {
  useFakeStorage();
  jest.useFakeTimers();
  jest.clearAllMocks();
  grabbed.library = null;
});
afterEach(() => jest.useRealTimers());

describe('WidgetPublisher', () => {
  it('publishes what the library holds, without being asked', async () => {
    await mount();
    await settle();
    expect(mockPublishPlan).toHaveBeenCalledTimes(1);
    expect(mockPublishYear).toHaveBeenCalledTimes(1);
  });

  it('waits for a burst of edits to stop', async () => {
    // The Steam-import case: sixty games arriving one write at a time
    // must not be sixty trips through the reload budget.
    await mount();
    await settle();
    mockPublishPlan.mockClear();

    await act(async () => {
      grabbed.library?.setStatus(game(1), 'playing');
      jest.advanceTimersByTime(200);
      grabbed.library?.setStatus(game(2), 'playing');
      jest.advanceTimersByTime(200);
      grabbed.library?.setStatus(game(3), 'playing');
    });
    // Nothing yet — the burst has not settled.
    expect(mockPublishPlan).not.toHaveBeenCalled();

    await settle();
    expect(mockPublishPlan).toHaveBeenCalledTimes(1);
  });

  it('sends the whole week, one entry per morning', async () => {
    await mount();
    await act(async () => {
      grabbed.library?.setStatus(game(1), 'playing');
    });
    await settle();
    const days = mockPublishPlan.mock.calls.at(-1)?.[0] as {
      at: number;
      pressure: { urgency: string };
    }[];
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveProperty('tonight');
    expect(days[0].pressure.urgency).toBe('calm');
  });

  it('says nothing when nothing a widget shows has changed', async () => {
    // Several inputs here are rebuilt on every render, and a few change
    // without changing what a widget would draw. Each of those would
    // otherwise cost a write and two reloads for no visible difference.
    await mount();
    await settle();
    const first = mockPublishPlan.mock.calls.length;

    await act(async () => {
      grabbed.library?.setStatus(game(1), 'playing');
    });
    await settle();
    expect(mockPublishPlan.mock.calls.length).toBeGreaterThan(first);
    const second = mockPublishPlan.mock.calls.length;

    // Setting the same status again changes nothing anybody can see.
    await act(async () => {
      grabbed.library?.setStatus(game(1), 'playing');
    });
    await settle();
    expect(mockPublishPlan).toHaveBeenCalledTimes(second);
  });
});
