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
   * Hours already put in, when we know them — measured from Steam, not
   * guessed. What is left of a game is its length minus this, which is
   * the difference between a plan that knows you are 30 hours into a 40
   * hour game and one that assumes you are halfway through everything.
   */
  hoursPlayed?: number;
  /** The Steam app this entry was matched to, if it came from there. */
  steamAppId?: number;
  /**
   * Finish it by this date, epoch ms. A game's own deadline beats the
   * plan's window: "before the sequel lands" is a real constraint and it
   * belongs to one game, not to the whole backlog.
   */
  deadline?: number;
  /** 3 = must play, 2 = normal (default), 1 = maybe. See lib/scheduler. */
  want?: number;
  /** Whatever you want to remember about it. Yours, and only on here. */
  note?: string;
  /** What you thought of it, 1-5. Nothing to do with the critics. */
  rating?: number;
  /**
   * Your own shelves: "co-op", "with Sam", "winter". A backlog is not
   * one list, and three statuses cannot say what a person means.
   */
  tags?: string[];
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

/** Persist a snapshot of what the app renders, not RAWG's whole payload. */
const slim = (game: Game): Game => ({
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
});

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
  /**
   * Record measured progress against games already saved. Hours of 0 or
   * less clear it — an entry claiming zero progress is noise.
   */
  setProgress: (progress: Record<number, number>) => void;
  /**
   * Save several games at once, as one write.
   *
   * Importing a library one setStatus at a time would be dozens of
   * renders and dozens of writes to the device, and a failure halfway
   * through would leave a half-imported library behind.
   */
  addGames: (
    games: {
      game: Game;
      status: LibraryStatus;
      hoursPlayed?: number;
      steamAppId?: number;
    }[]
  ) => number;
  /**
   * Set a game's own deadline (epoch ms) or clear it with null. Only
   * applies to a game already in the library — a deadline on something
   * you have not saved is not a plan, it is a wish.
   */
  setDeadline: (id: number, deadline: number | null) => void;
  /** Mark how much a saved game is wanted: 3 must play, 2 normal, 1 maybe. */
  setWant: (id: number, want: number) => void;
  /** Your own note on a saved game; empty clears it. */
  setNote: (id: number, note: string) => void;
  /** Your own score out of five; 0 clears it. */
  setRating: (id: number, rating: number) => void;
  /** Add one of your own shelves to a saved game. */
  addTag: (id: number, tag: string) => void;
  /** Take it off again. */
  removeTag: (id: number, tag: string) => void;
  /** Every shelf in use, alphabetically — the filter list writes itself. */
  tags: string[];
  /**
   * Let several games go at once.
   *
   * The point of the app is permission to drop things, and dropping
   * them one at a time is a chore that quietly argues against doing it.
   */
  removeMany: (ids: number[]) => number;
  /** Move several games to a status in one write. */
  moveMany: (ids: number[], status: LibraryStatus) => number;
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
  // Counting what a bulk action touched needs the current entries, and a
  // state updater cannot report back — it may run more than once. Kept
  // in sync from an effect rather than during render, which would be a
  // write while rendering.
  const entriesRef = useRef(stored);
  useEffect(() => {
    entriesRef.current = stored;
  }, [stored]);

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
        const existing = prev[String(game.id)];
        next[String(game.id)] = {
          game: slim(game),
          status,
          addedAt: existing?.addedAt ?? Date.now(),
          // Measured progress outlives a status change: moving a game to
          // "playing" does not un-know the thirty hours behind it.
          hoursPlayed: existing?.hoursPlayed,
          steamAppId: existing?.steamAppId,
          deadline: existing?.deadline,
          want: existing?.want,
          finishedAt:
            status === 'finished'
              ? (existing?.finishedAt ?? Date.now())
              : undefined,
        };
      }
      return next;
    });
  }, []);

  const setProgress = useCallback((progress: Record<number, number>) => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const [id, hours] of Object.entries(progress)) {
        const entry = next[id];
        if (!entry) continue;
        next[id] = { ...entry, hoursPlayed: hours > 0 ? hours : undefined };
      }
      return next;
    });
  }, []);

  const addGames = useCallback<LibraryContextValue['addGames']>((games) => {
    if (games.length === 0) return 0;
    setEntries((prev) => {
      const next = { ...prev };
      for (const { game, status, hoursPlayed, steamAppId } of games) {
        const existing = next[String(game.id)];
        next[String(game.id)] = {
          game: slim(game),
          // A game already in the library keeps the status its owner
          // gave it; an import adds games, it does not overrule them.
          status: existing?.status ?? status,
          addedAt: existing?.addedAt ?? Date.now(),
          hoursPlayed: hoursPlayed ?? existing?.hoursPlayed,
          steamAppId: steamAppId ?? existing?.steamAppId,
          finishedAt: existing?.finishedAt,
        };
      }
      return next;
    });
    return games.length;
  }, []);

  const setDeadline = useCallback((id: number, deadline: number | null) => {
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry) return prev;
      return {
        ...prev,
        [String(id)]: { ...entry, deadline: deadline ?? undefined },
      };
    });
  }, []);

  const setWant = useCallback((id: number, want: number) => {
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry) return prev;
      return { ...prev, [String(id)]: { ...entry, want } };
    });
  }, []);

  const setNote = useCallback((id: number, note: string) => {
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry) return prev;
      const trimmed = note.trim();
      return {
        ...prev,
        [String(id)]: { ...entry, note: trimmed === '' ? undefined : trimmed },
      };
    });
  }, []);

  const setRating = useCallback((id: number, rating: number) => {
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry) return prev;
      return {
        ...prev,
        [String(id)]: {
          ...entry,
          rating: rating > 0 ? Math.min(5, Math.round(rating)) : undefined,
        },
      };
    });
  }, []);

  const addTag = useCallback((id: number, tag: string) => {
    const clean = tag.trim().slice(0, 24);
    if (clean === '') return;
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry) return prev;
      const existing = entry.tags ?? [];
      // Case-insensitively unique: "Co-op" and "co-op" are one shelf.
      if (existing.some((t) => t.toLowerCase() === clean.toLowerCase()))
        return prev;
      return {
        ...prev,
        [String(id)]: { ...entry, tags: [...existing, clean] },
      };
    });
  }, []);

  const removeTag = useCallback((id: number, tag: string) => {
    setEntries((prev) => {
      const entry = prev[String(id)];
      if (!entry?.tags) return prev;
      const next = entry.tags.filter(
        (t) => t.toLowerCase() !== tag.toLowerCase()
      );
      return {
        ...prev,
        [String(id)]: { ...entry, tags: next.length > 0 ? next : undefined },
      };
    });
  }, []);

  const removeMany = useCallback((ids: number[]) => {
    const count = ids.filter((id) => entriesRef.current[String(id)]).length;
    setEntries((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[String(id)];
      return next;
    });
    return count;
  }, []);

  const moveMany = useCallback((ids: number[], status: LibraryStatus) => {
    const count = ids.filter((id) => entriesRef.current[String(id)]).length;
    setEntries((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const entry = next[String(id)];
        if (!entry) continue;
        next[String(id)] = {
          ...entry,
          status,
          finishedAt:
            status === 'finished'
              ? (entry.finishedAt ?? Date.now())
              : undefined,
        };
      }
      return next;
    });
    return count;
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
      setProgress,
      addGames,
      setDeadline,
      setWant,
      setNote,
      setRating,
      addTag,
      removeTag,
      tags: [
        ...new Set(Object.values(entries).flatMap((entry) => entry.tags ?? [])),
      ].sort((a, b) => a.localeCompare(b)),
      removeMany,
      moveMany,
      saveError,
    }),
    [
      entries,
      setStatus,
      importJson,
      setProgress,
      addGames,
      setDeadline,
      setWant,
      setNote,
      setRating,
      addTag,
      removeTag,
      removeMany,
      moveMany,
      saveError,
    ]
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
