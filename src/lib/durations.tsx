import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { resolveDuration, type Duration } from './duration';
import type { Game } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';

const STORAGE_KEY = 'sidequest.durations.v1';

/** A stable identity, so gating cannot itself churn memoised consumers. */
const EMPTY: Overrides = {};

/** Game id → hours the player told us it takes. */
type Overrides = Record<string, number>;

function load(): Overrides {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Overrides;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, hours]) => typeof hours === 'number' && hours > 0
      )
    );
  } catch {
    return {};
  }
}

function persist(overrides: Overrides) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // A full or blocked store must not break planning.
  }
}

interface DurationsValue {
  /** How long this game takes, and where that number came from. */
  durationOf: (game: Pick<Game, 'id' | 'playtime' | 'released'>) => Duration;
  /** Record what a game actually takes. */
  setDuration: (id: number, hours: number) => void;
  /** Go back to RAWG's estimate. */
  clearDuration: (id: number) => void;
  /** How many lengths this person has corrected. */
  count: number;
}

const DurationsContext = createContext<DurationsValue | null>(null);

/**
 * Player-corrected game lengths.
 *
 * The Plan is only as honest as the durations feeding it, and the broad
 * source we have is an average that is wrong often enough to notice. This
 * lets a person fix any number they know better, keeps it on their
 * device, and makes their correction win everywhere.
 */
export function DurationsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setOverrides] = useState<Overrides>(load);
  // The pre-rendered HTML had no stored durations, so the hydration
  // render must not either. Writes still go to `stored`.
  const overrides = useHydrated() ? stored : EMPTY;

  const setDuration = useCallback((id: number, hours: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [String(id)]: hours };
      persist(next);
      return next;
    });
  }, []);

  const clearDuration = useCallback((id: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<DurationsValue>(
    () => ({
      durationOf: (game) => resolveDuration(game, overrides[String(game.id)]),
      setDuration,
      clearDuration,
      count: Object.keys(overrides).length,
    }),
    [overrides, setDuration, clearDuration]
  );

  return (
    <DurationsContext.Provider value={value}>
      {children}
    </DurationsContext.Provider>
  );
}

export function useDurations(): DurationsValue {
  const ctx = useContext(DurationsContext);
  if (!ctx) {
    throw new Error('useDurations must be used inside DurationsProvider');
  }
  return ctx;
}
