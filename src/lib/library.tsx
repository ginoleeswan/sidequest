import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Game } from '@/api/types';

export type LibraryStatus = 'wishlist' | 'playing' | 'finished';

export interface LibraryEntry {
  game: Game;
  status: LibraryStatus;
  addedAt: number;
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

function load(): Entries {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Entries) : {};
  } catch {
    return {};
  }
}

function persist(entries: Entries) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — the in-memory copy still works.
  }
}

interface LibraryContextValue {
  entries: Entries;
  statusOf: (id: number) => LibraryStatus | null;
  setStatus: (game: Game, status: LibraryStatus | null) => void;
  byStatus: (status: LibraryStatus) => LibraryEntry[];
  count: number;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entries>(load);

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
        };
      }
      persist(next);
      return next;
    });
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
    }),
    [entries, setStatus]
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
