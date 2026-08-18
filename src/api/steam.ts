/** Client side of Steam connect. The key never leaves the server function. */

export interface SteamGame {
  appid: number;
  name: string;
  minutesForever: number;
  minutes2Weeks: number;
}

export interface SteamSnapshot {
  steamid: string;
  name: string;
  avatar: string | null;
  gameCount: number;
  /** Measured pace: hours per week over Steam's two-week window. */
  hoursPerWeek: number;
  /** Games touched in the last two weeks, most-played first. */
  recent: SteamGame[];
  fetchedAt: number;
}

/**
 * Accepts a profile URL, a vanity name, or a bare SteamID64 and returns
 * what to resolve. Pure - unit tested.
 */
export function parseSteamInput(
  raw: string
):
  | { kind: 'steamid'; value: string }
  | { kind: 'vanity'; value: string }
  | null {
  const input = raw.trim();
  if (input === '') return null;

  const urlMatch = input.match(
    /steamcommunity\.com\/(id|profiles)\/([^/?#\s]+)/i
  );
  if (urlMatch) {
    const [, kind, value] = urlMatch;
    return kind.toLowerCase() === 'profiles'
      ? /^7656\d{13}$/.test(value)
        ? { kind: 'steamid', value }
        : null
      : { kind: 'vanity', value };
  }
  if (/^7656\d{13}$/.test(input)) return { kind: 'steamid', value: input };
  if (/^[A-Za-z0-9_-]{2,64}$/.test(input))
    return { kind: 'vanity', value: input };
  return null;
}

/** Pure - unit tested. Steam reports minutes over a rolling two weeks. */
export function measuredHoursPerWeek(games: SteamGame[]): number {
  const minutes = games.reduce((sum, g) => sum + g.minutes2Weeks, 0);
  return Math.round((minutes / 60 / 2) * 10) / 10;
}

export function recentGames(games: SteamGame[]): SteamGame[] {
  return games
    .filter((g) => g.minutes2Weeks > 0)
    .sort((a, b) => b.minutes2Weeks - a.minutes2Weeks);
}

async function call<T>(params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params);
  const res = await fetch(`/api/steam?${search}`);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Steam request failed (${res.status})`);
  }
  return body;
}

export async function connectSteam(rawInput: string): Promise<SteamSnapshot> {
  const parsed = parseSteamInput(rawInput);
  if (!parsed) {
    throw new Error(
      'That doesn’t look like a Steam profile — try your profile URL.'
    );
  }

  const steamid =
    parsed.kind === 'steamid'
      ? parsed.value
      : (
          await call<{ steamid: string }>({
            op: 'resolve',
            vanity: parsed.value,
          })
        ).steamid;

  const data = await call<{
    player: { name: string; avatar: string | null };
    gameCount: number;
    games: SteamGame[];
  }>({ op: 'owned', steamid });

  return {
    steamid,
    name: data.player.name,
    avatar: data.player.avatar,
    gameCount: data.gameCount,
    hoursPerWeek: measuredHoursPerWeek(data.games),
    recent: recentGames(data.games).slice(0, 8),
    fetchedAt: Date.now(),
  };
}
