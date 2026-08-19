import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Game } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { readVersioned, writeFailureMessage, writeJson } from '@/lib/storage';

export type LibraryStatus = 'wishlist' | 'playing' | 'finished';

export interface LibraryEntry {
  game: Game;
  status: LibraryStatus;
  addedAt: number;
  /**
   * When the credits rolled. Distinct from addedAt, which is when the
   * game entered the library — a game saved last year and finished today
   * belongs to today.
   */
  finishedAt?: number;
}

export const STATUS_META: Record<
  LibraryStatus,
  { label: string; icon: string }
> = {
  wishlist: { label: 'Want to play', icon: 'bookmark' },
  playing: { label: 'Playing', icon: 'game-controller' },
  finished: { label: 'Finished', icon: 'checkmark-circle' },
};

type Entries = Record<string, LibraryEntry>;

const STORAGE_KEY = 'sidequest.library.v1';

/** A stable identity, so gating cannot itself churn memoised consumers. */
const EMPTY: Entries = {};

/**
 * No earlier shape exists yet, so the chain is empty — but it is wired,
 * which is the point. Bumping to a v2 key without one would abandon
 * every existing library on the next deploy.
 */
const load = (): Entries => readVersioned<Entries>(STORAGE_KEY, {}, []);

interface LibraryContextValue {
  entries: Entries;
  statusOf: (id: number) => LibraryStatus | null;
  setStatus: (game: Game, status: LibraryStatus | null) => void;
  byStatus: (status: LibraryStatus) => LibraryEntry[];
  count: number;
  /** The whole library as a transferable string. */
  exportJson: () => string;
  /** Merge a transfer string in; returns how many entries were added. */
  importJson: (raw: string) => number;
  /** Set when the last write to the device failed; null when it landed. */
  saveError: string | null;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [stored, setEntries] = useState<Entries>(load);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The pre-rendered HTML was generated with an empty library, so the
  // hydration render must show one too. Writes still go to `stored`.
  const hydrated = useHydrated();
  const entries = hydrated ? stored : EMPTY;

  /**
   * Persisting in an effect rather than inside the state updaters keeps
   * those updaters pure — React may call them more than once — and gives
   * one place for a failed write to be noticed. The library is the only
   * copy of this data, so a write that fails has to be said out loud
   * rather than swallowed.
   */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const result = writeJson(STORAGE_KEY, stored);
    setSaveError(result.ok ? null : writeFailureMessage(result));
  }, [stored]);

  const setStatus = useCallback((game: Game, status: LibraryStatus | null) => {
    setEntries((prev) => {
      const next = { ...prev };
      if (status == null) {
        delete next[String(game.id)];
      } else {
        next[String(game.id)] = {
          // Persist a slim snapshot, not the whole payload.
          game: {
            id: game.id,
            slug: game.slug,
            name: game.name,
            background_image: game.background_image,
            rating: game.rating,
            rating_top: game.rating_top,
            released: game.released,
            playtime: game.playtime,
            metacritic: game.metacritic,
            parent_platforms: game.parent_platforms,
            genres: game.genres?.slice(0, 2),
          },
          status,
          addedAt: prev[String(game.id)]?.addedAt ?? Date.now(),
          finishedAt:
            status === 'finished'
              ? (prev[String(game.id)]?.finishedAt ?? Date.now())
              : undefined,
        };
      }
      return next;
    });
  }, []);

  const importJson = useCallback((raw: string): number => {
    const parsed = JSON.parse(raw) as Entries;
    const incoming = Object.entries(parsed).filter(
      ([, entry]) =>
        entry &&
        typeof entry.game?.id === 'number' &&
        typeof entry.game?.name === 'string' &&
        ['wishlist', 'playing', 'finished'].includes(entry.status)
    );
    if (incoming.length === 0) throw new Error('No library entries found');
    setEntries((prev) => {
      const next = { ...prev };
      for (const [key, entry] of incoming) {
        next[key] = entry;
      }
      return next;
    });
    return incoming.length;
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      entries,
      statusOf: (id) => entries[String(id)]?.status ?? null,
      setStatus,
      byStatus: (status) =>
        Object.values(entries)
          .filter((e) => e.status === status)
          .sort((a, b) => b.addedAt - a.addedAt),
      count: Object.keys(entries).length,
      exportJson: () => JSON.stringify(entries),
      importJson,
      saveError,
    }),
    [entries, setStatus, importJson, saveError]
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
