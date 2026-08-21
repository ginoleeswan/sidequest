import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useHydrated } from '../useHydrated';
import { usePersistedState } from '../usePersistedState';
import { _setBackendForTests } from '@/lib/storage';

const store: Record<string, string> = {};

beforeAll(() => {
  _setBackendForTests({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  });
});

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

function Probe({ k, initial }: { k: string; initial: number }) {
  const [value, set] = usePersistedState(k, initial);
  return <Text onPress={() => set(value + 1)}>{`v=${value}`}</Text>;
}

describe('useHydrated', () => {
  it('is true once the client has rendered', async () => {
    function H() {
      return <Text>{String(useHydrated())}</Text>;
    }
    await render(<H />);
    expect(screen.getByText('true')).toBeTruthy();
  });
});

describe('usePersistedState', () => {
  it('falls back to the initial value when nothing is stored', async () => {
    await render(<Probe k="a" initial={6} />);
    expect(screen.getByText('v=6')).toBeTruthy();
  });

  it('reads a previously stored value', async () => {
    store.b = '11';
    await render(<Probe k="b" initial={6} />);
    expect(screen.getByText('v=11')).toBeTruthy();
  });

  it('writes through to storage', async () => {
    await render(<Probe k="c" initial={1} />);
    await act(async () => screen.getByText('v=1').props.onPress());
    expect(screen.getByText('v=2')).toBeTruthy();
    expect(store.c).toBe('2');
  });

  it('survives unparseable storage rather than throwing', async () => {
    store.d = '{not json';
    await render(<Probe k="d" initial={3} />);
    expect(screen.getByText('v=3')).toBeTruthy();
  });
});
