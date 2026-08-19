import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DurationsProvider, useDurations } from '../durations';

const KEY = 'sidequest.durations.v1';
let store: Record<string, string> = {};
let failWrites = false;

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        if (failWrites)
          throw Object.assign(new Error('full'), {
            name: 'QuotaExceededError',
          });
        store[k] = v;
      },
      removeItem: (k: string) => delete store[k],
    },
  });
});

beforeEach(() => {
  store = {};
  failWrites = false;
});

const GAME = { id: 7, playtime: 12, released: '2020-01-01' };

function Probe({
  onReady,
}: {
  onReady?: (api: ReturnType<typeof useDurations>) => void;
}) {
  const api = useDurations();
  onReady?.(api);
  const d = api.durationOf(GAME);
  return (
    <Text>{`${d.hours}|${d.source}|${api.count}|${api.saveError ?? '-'}`}</Text>
  );
}

async function mount() {
  let api!: ReturnType<typeof useDurations>;
  await render(
    <DurationsProvider>
      <Probe onReady={(a) => (api = a)} />
    </DurationsProvider>
  );
  return () => api;
}

describe('DurationsProvider', () => {
  it('falls back to the source estimate when nothing is corrected', async () => {
    await mount();
    expect(screen.getByText('12|estimate|0|-')).toBeTruthy();
  });

  it('prefers a stored correction over the estimate', async () => {
    store[KEY] = JSON.stringify({ 7: 30 });
    await mount();
    expect(screen.getByText('30|yours|1|-')).toBeTruthy();
  });

  it('records a correction and counts it', async () => {
    const api = await mount();
    await act(async () => api().setDuration(7, 25));
    expect(screen.getByText('25|yours|1|-')).toBeTruthy();
    expect(JSON.parse(store[KEY])).toEqual({ 7: 25 });
  });

  it('clears a correction back to the estimate', async () => {
    store[KEY] = JSON.stringify({ 7: 30 });
    const api = await mount();
    await act(async () => api().clearDuration(7));
    expect(screen.getByText('12|estimate|0|-')).toBeTruthy();
    expect(JSON.parse(store[KEY])).toEqual({});
  });

  /** A zero or negative length would make the planner nonsense. */
  it('ignores stored values that are not plausible lengths', async () => {
    store[KEY] = JSON.stringify({ 7: 0, 8: -5, 9: 'ten' });
    await mount();
    expect(screen.getByText('12|estimate|0|-')).toBeTruthy();
  });

  it('starts clean when storage holds corrupt JSON', async () => {
    store[KEY] = '{not json';
    await mount();
    expect(screen.getByText('12|estimate|0|-')).toBeTruthy();
  });

  it('surfaces a failed write instead of pretending it saved', async () => {
    const api = await mount();
    failWrites = true;
    await act(async () => api().setDuration(7, 25));
    expect(screen.getByText(/full/)).toBeTruthy();
  });

  it('does not write on first render, only on a change', async () => {
    store[KEY] = JSON.stringify({ 7: 30 });
    await mount();
    // Untouched: the provider must not rewrite what it just read.
    expect(store[KEY]).toBe(JSON.stringify({ 7: 30 }));
  });

  it('refuses to be used outside its provider', async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow();
    quiet.mockRestore();
  });
});
