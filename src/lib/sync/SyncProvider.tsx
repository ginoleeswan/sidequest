import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  NO_CURSORS,
  NO_KNOWN,
  NO_QUARANTINE,
  syncOnce,
  type Cursors,
  type Known,
  type Quarantine,
  type SyncBackend,
} from './engine';
import type { Preferences } from './shape';
import { supabaseBackend } from './supabaseBackend';
import { useAuth } from '../auth';
import { useDurations } from '../durations';
import { useLibrary } from '../library';
import { kv, readJson, writeJson } from '../storage';

/**
 * When sync happens, and what it says while it is happening.
 *
 * The engine is a function; this is the only part that decides to call
 * it. Two triggers, and no others: signing in, and a local change that
 * has stopped changing. There is no timer and no polling — an app that
 * talks to a server every thirty seconds to find nothing is spending
 * somebody's battery on reassurance.
 *
 * Everything here degrades to nothing. Signed out, unconfigured, or
 * offline, this provider renders its children and holds `idle`, which
 * is the state the app has always been in and works perfectly well in.
 */

const CURSOR_KEY = 'sidequest.sync.cursors.v1';
/**
 * What the server was last confirmed to hold.
 *
 * Kept beside the cursor rather than inside it because the two answer
 * different questions and are allowed to be missing independently: a
 * device upgrading from a build without this record still has a valid
 * cursor, and simply re-pushes its library once.
 */
const KNOWN_KEY = 'sidequest.sync.known.v1';
/**
 * Rows the server has refused, so they are not offered again until
 * they change. Kept across launches because the refusal is a fact
 * about the row, not about the session that discovered it.
 */
const STUCK_KEY = 'sidequest.sync.stuck.v1';
const PREFS_KEYS = {
  pace: 'sidequest.plan.pace',
  planWindow: 'sidequest.plan.window',
  steam: 'sidequest.steam.v1',
  stamp: 'sidequest.prefs.updatedAt.v1',
} as const;

/**
 * How long a change has to stop changing before it goes up.
 *
 * Long enough that dragging the pace slider is one upload rather than
 * forty, short enough that closing the laptop straight after a change
 * does not lose it.
 */
const SETTLE_MS = 2_500;

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'synced'; at: number }
  | { state: 'failed'; reason: string; at: number };

interface SyncValue {
  status: SyncStatus;
  /**
   * Games the server would not accept, named rather than counted.
   *
   * Empty almost always. When it is not, the account screen has to be
   * able to say which game and what the server said, because the only
   * thing that clears a refusal is the person editing the row.
   */
  stuck: { key: string; reason: string }[];
  /** Whether an account is signed in and sync is therefore possible. */
  active: boolean;
  /**
   * Run a round now — the account screen's retry, and what a pull to
   * refresh does. Resolves when the round has settled, so a spinner
   * can wait for it.
   */
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);

/** Read the loose preference keys as one object. */
function readPreferences(): Preferences {
  return {
    pace: readJson<number | undefined>(PREFS_KEYS.pace, undefined),
    planWindow: readJson<string | null>(PREFS_KEYS.planWindow, null),
    steam: readJson<unknown>(PREFS_KEYS.steam, null),
    updatedAt: readJson<number>(PREFS_KEYS.stamp, 0),
  };
}

function writePreferences(prefs: Preferences) {
  if (prefs.pace != null) writeJson(PREFS_KEYS.pace, prefs.pace);
  writeJson(PREFS_KEYS.planWindow, prefs.planWindow ?? null);
  if (prefs.steam != null) writeJson(PREFS_KEYS.steam, prefs.steam);
  writeJson(PREFS_KEYS.stamp, prefs.updatedAt ?? Date.now());
}

export function SyncProvider({
  children,
  /** The engine's door, swapped in tests. */
  makeBackend = supabaseBackend,
}: {
  children: React.ReactNode;
  makeBackend?: (userId: string) => SyncBackend;
}) {
  const { session } = useAuth();
  const library = useLibrary();
  const durations = useDurations();
  const [runStatus, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const [stuck, setStuck] = useState<{ key: string; reason: string }[]>([]);

  const userId = session?.user?.id ?? null;

  // Held in refs so the runner can read the latest without being
  // rebuilt — and so a round in flight cannot be started twice.
  const inFlight = useRef(false);
  const latest = useRef({ library, durations });
  useEffect(() => {
    latest.current = { library, durations };
  });

  const run = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    setStatus({ state: 'syncing' });

    const { library: lib, durations: dur } = latest.current;
    const result = await syncOnce(makeBackend(userId), {
      entries: lib.entries,
      durations: dur.overrides,
      preferences: readPreferences(),
      cursors: readJson<Cursors>(CURSOR_KEY, NO_CURSORS),
      known: readJson<Known>(KNOWN_KEY, NO_KNOWN),
      quarantine: readJson<Quarantine>(STUCK_KEY, NO_QUARANTINE),
    });

    if (result.ok) {
      // Adopt without restamping: these are another device's edits, and
      // marking them local would push them straight back.
      lib.adoptSynced(result.state.entries);
      dur.adoptSynced(result.state.durations);
      writePreferences(result.state.preferences);
      writeJson(CURSOR_KEY, result.state.cursors);
      writeJson(KNOWN_KEY, result.state.known ?? NO_KNOWN);
      writeJson(STUCK_KEY, result.state.quarantine ?? NO_QUARANTINE);
      setStuck(result.stuck);
      setStatus({ state: 'synced', at: Date.now() });
    } else {
      setStatus({ state: 'failed', reason: result.reason, at: Date.now() });
    }
    inFlight.current = false;
  }, [userId, makeBackend]);

  /**
   * The retry, which has to mean something for a refused row too.
   *
   * Automatic rounds skip what the server already rejected, and that is
   * right: re-sending the same row to get the same answer is a waste of
   * somebody's battery. But a person pressing Sync now is explicitly
   * asking for another go — often because they just changed something
   * elsewhere, or because the constraint itself moved — and a button
   * that quietly does nothing is worse than no button.
   */
  const syncNow = useCallback(() => {
    kv.removeItem(STUCK_KEY);
    return run();
  }, [run]);

  // Signing in: catch up immediately, in both directions.
  useEffect(() => {
    if (userId) void run();
  }, [userId, run]);

  /**
   * Signed out reads as idle without a write.
   *
   * Deriving it rather than setting it in the effect above is not
   * tidiness: a setState there runs on the same commit that cleared the
   * session, which is a cascading render the compiler is right to
   * refuse.
   */
  const status = useMemo<SyncStatus>(
    () => (userId ? runStatus : { state: 'idle' }),
    [userId, runStatus]
  );

  // A local change, once it has stopped. The library and durations
  // objects are new on every edit, which is exactly the signal wanted.
  const localVersion = `${Object.keys(library.entries).length}:${
    durations.count
  }:${library.count}`;
  const firstPass = useRef(true);
  useEffect(() => {
    if (!userId) return;
    if (firstPass.current) {
      firstPass.current = false;
      return;
    }
    const timer = setTimeout(() => void run(), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [localVersion, userId, run]);

  const value = useMemo<SyncValue>(
    () => ({
      status,
      stuck: userId ? stuck : [],
      active: Boolean(userId),
      syncNow,
    }),
    [status, stuck, userId, syncNow]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  // Absent rather than throwing: the whole feature is optional, and a
  // screen that renders fine without an account must render fine
  // without this too.
  return (
    ctx ?? {
      status: { state: 'idle' },
      stuck: [],
      active: false,
      syncNow: async () => {},
    }
  );
}

/** Sign-out forgets where sync got to, so the next account starts clean. */
export function forgetSyncCursors() {
  kv.removeItem(CURSOR_KEY);
  kv.removeItem(KNOWN_KEY);
  kv.removeItem(STUCK_KEY);
}
