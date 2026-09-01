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
import { fetchIgdbBatch, type TimeToBeatBySlug } from '@/api/igdb';
import type { Game } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { readRescued, writeFailureMessage, writeJson } from '@/lib/storage';

const STORAGE_KEY = 'sidequest.durations.v1';

/** A stable identity, so gating cannot itself churn memoised consumers. */
const EMPTY: Overrides = {};

/** Game id → hours the player told us it takes. */
type Overrides = Record<string, number>;

/**
 * The lengths somebody corrected by hand, and a rescue if the file
 * holding them will not parse.
 *
 * Small compared with the library and not small in effort: every entry
 * here is a number a person went and found out, and the plan trusts
 * these over every estimate it has. Losing them silently — read as
 * empty, overwritten by the next correction — is the same failure the
 * library had, in a store nobody would think to check.
 *
 * The shape filter stays and does a second job: a file that parses but
 * holds nonsense degrades to the entries that make sense rather than
 * poisoning every duration in the app.
 */
function load(): { value: Overrides; error: string | null } {
  const read = readRescued<Overrides>(STORAGE_KEY, {}, []);
  return {
    value: Object.fromEntries(
      Object.entries(read.value).filter(
        ([, hours]) => typeof hours === 'number' && hours > 0
      )
    ),
    error:
      read.rescue === 'none'
        ? null
        : read.rescue === 'kept'
          ? 'The lengths you corrected could not be read, so the plan is using estimates for now. The unreadable copy has been kept on this device.'
          : 'The lengths you corrected could not be read, and the unreadable copy could not be kept.',
  };
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
  /**
   * The IGDB box art learned by those same calls: a cover image id for
   * `igdbCoverUri`, or null while unknown. Free — it arrives on the
   * round trip the durations already pay for.
   */
  coverOf: (slug?: string | null) => string | null;
  /** Record what a game actually takes. */
  setDuration: (id: number, hours: number) => void;
  /** Go back to RAWG's estimate. */
  clearDuration: (id: number) => void;
  /** Sync's way in: adopt an already-merged set of corrections. */
  adoptSynced: (overrides: Record<string, number>) => void;
  /**
   * The corrections themselves, for sync to send.
   *
   * Read-only by convention: every write goes through setDuration or
   * clearDuration, which are the two the rest of the app uses.
   */
  overrides: Record<string, number>;
  /** How many lengths this person has corrected. */
  count: number;
  /** Set when the last write to the device failed; null when it landed. */
  saveError: string | null;
  /**
   * Set when the stored corrections would not parse. Distinct from
   * `saveError`: that one means the device refused a write, this one
   * means what was already there could not be read.
   */
  loadError: string | null;
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
  const [initial] = useState(load);
  const [stored, setOverrides] = useState<Overrides>(initial.value);
  const loadError = initial.error;
  /**
   * Reported times, by slug.
   *
   * Kept in memory rather than on the device: they belong to IGDB, not
   * to this person, and the query cache already keeps the HTTP answer
   * around. `asked` stops a screen that re-renders from re-asking.
   */
  const [reported, setReported] = useState<TimeToBeatBySlug>({});
  /**
   * Box art, by slug, from the same round trip as the times. This
   * provider is where the batching already lives — every screen calls
   * `learnDurations` for whatever it shows — so the covers ride along
   * rather than earning a second pipeline of their own.
   */
  const [covers, setCovers] = useState<Record<string, string>>({});
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

  /**
   * Collected for a beat before the request goes out. Screens ask in
   * one call, but the tiles themselves also ask, one slug each, as a
   * shelf renders — and forty tiles must not mean forty round trips.
   * Everything that asks inside the window shares one batch.
   */
  const pending = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const learnDurations = useCallback((slugs: (string | undefined)[]) => {
    for (const slug of slugs)
      if (slug && !asked.current.has(slug)) {
        asked.current.add(slug);
        pending.current.add(slug);
      }
    if (pending.current.size === 0 || flushTimer.current) return;

    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const wanted = [...pending.current];
      pending.current.clear();
      fetchIgdbBatch(wanted)
        .then(({ times, covers: found }) => {
          if (Object.keys(times).length > 0)
            setReported((prev) => ({ ...prev, ...times }));
          if (Object.keys(found).length > 0)
            setCovers((prev) => ({ ...prev, ...found }));
        })
        // A length nobody has is better than a screen that will not
        // draw: everything here degrades to RAWG's estimate.
        .catch(() => {});
    }, 50);
  }, []);

  const setDuration = useCallback((id: number, hours: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [String(id)]: hours };
      return next;
    });
  }, []);

  const adoptSynced = useCallback(
    (next: Record<string, number>) => setOverrides(next),
    []
  );

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
      coverOf: (slug) => (slug ? (covers[slug] ?? null) : null),
      setDuration,
      clearDuration,
      adoptSynced,
      overrides,
      count: Object.keys(overrides).length,
      saveError,
      loadError,
    }),
    [
      covers,
      overrides,
      reported,
      learnDurations,
      setDuration,
      clearDuration,
      adoptSynced,
      saveError,
      loadError,
    ]
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
