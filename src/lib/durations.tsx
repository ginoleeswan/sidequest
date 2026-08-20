import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { resolveDuration, type Duration } from './duration';
import { fetchTimesToBeat, type TimeToBeatBySlug } from '@/api/igdb';
import type { Game } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { readVersioned, writeFailureMessage, writeJson } from '@/lib/storage';

const STORAGE_KEY = 'sidequest.durations.v1';

/** A stable identity, so gating cannot itself churn memoised consumers. */
const EMPTY: Overrides = {};

/** Game id → hours the player told us it takes. */
type Overrides = Record<string, number>;

function load(): Overrides {
  const parsed = readVersioned<Overrides>(STORAGE_KEY, {}, []);
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([, hours]) => typeof hours === 'number' && hours > 0
    )
  );
}

interface DurationsValue {
  /** How long this game takes, and where that number came from. */
  durationOf: (
    game: Pick<Game, 'id' | 'playtime' | 'released'> & { slug?: string }
  ) => Duration;
  /**
   * Ask for the reported completion times of these games.
   *
   * Idempotent and batched: a slug already known, or already being
   * asked about, costs nothing. Screens call this for whatever they are
   * showing and the answers improve every length in the app at once.
   */
  learnDurations: (slugs: (string | undefined)[]) => void;
  /** Record what a game actually takes. */
  setDuration: (id: number, hours: number) => void;
  /** Go back to RAWG's estimate. */
  clearDuration: (id: number) => void;
  /** How many lengths this person has corrected. */
  count: number;
  /** Set when the last write to the device failed; null when it landed. */
  saveError: string | null;
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
  /**
   * Reported times, by slug.
   *
   * Kept in memory rather than on the device: they belong to IGDB, not
   * to this person, and the query cache already keeps the HTTP answer
   * around. `asked` stops a screen that re-renders from re-asking.
   */
  const [reported, setReported] = useState<TimeToBeatBySlug>({});
  const asked = useRef<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  // The pre-rendered HTML had no stored durations, so the hydration
  // render must not either. Writes still go to `stored`.
  const overrides = useHydrated() ? stored : EMPTY;

  // Persisted in an effect so the state updaters stay pure, and so a
  // write that fails is noticed rather than swallowed. See lib/storage.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const result = writeJson(STORAGE_KEY, stored);
    setSaveError(result.ok ? null : writeFailureMessage(result));
  }, [stored]);

  const learnDurations = useCallback((slugs: (string | undefined)[]) => {
    const wanted = slugs.filter(
      (slug): slug is string => Boolean(slug) && !asked.current.has(slug!)
    );
    if (wanted.length === 0) return;
    for (const slug of wanted) asked.current.add(slug);

    fetchTimesToBeat(wanted)
      .then((times) => {
        if (Object.keys(times).length === 0) return;
        setReported((prev) => ({ ...prev, ...times }));
      })
      // A length nobody has is better than a screen that will not draw:
      // everything here degrades to RAWG's estimate.
      .catch(() => {});
  }, []);

  const setDuration = useCallback((id: number, hours: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [String(id)]: hours };
      return next;
    });
  }, []);

  const clearDuration = useCallback((id: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[String(id)];
      return next;
    });
  }, []);

  const value = useMemo<DurationsValue>(
    () => ({
      durationOf: (game) =>
        resolveDuration(
          game,
          overrides[String(game.id)],
          undefined,
          game.slug ? reported[game.slug] : undefined
        ),
      learnDurations,
      setDuration,
      clearDuration,
      count: Object.keys(overrides).length,
      saveError,
    }),
    [overrides, reported, learnDurations, setDuration, clearDuration, saveError]
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
