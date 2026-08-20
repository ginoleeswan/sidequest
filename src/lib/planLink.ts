/**
 * A plan, as a link.
 *
 * Sharing normally means an account, a server and someone else's copy of
 * your data. A plan is small enough to avoid all three: the games, their
 * lengths and the pace go in the URL itself, so the link works for
 * anyone, forever, and this app never sees it.
 *
 * The format is deliberately terse and versioned. It ends up in a URL
 * people paste into chat, and a URL that wraps over three lines does not
 * get pasted twice.
 */

export interface SharedPlan {
  /** Hours a week the plan assumes. */
  pace: number;
  games: { name: string; hours: number }[];
}

const VERSION = '1';

/** Longer than this and the URL stops being pasteable. */
const MAX_GAMES = 20;
const MAX_NAME = 40;

const encode = (text: string): string =>
  // btoa needs latin-1; game names are not. Percent-encode first so the
  // Japanese in a title survives the round trip.
  btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const decode = (encoded: string): string =>
  decodeURIComponent(
    escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
  );

/**
 * Pack a plan into a string.
 *
 * Rows are `name~hours`, separated by `|`, prefixed by the version and
 * the pace. Names lose their separators rather than their meaning.
 */
export function encodePlan(plan: SharedPlan): string {
  const rows = plan.games
    .slice(0, MAX_GAMES)
    .map(
      ({ name, hours }) =>
        `${name.replace(/[|~]/g, ' ').slice(0, MAX_NAME)}~${
          Math.round(hours * 10) / 10
        }`
    )
    .join('|');
  return encode(`${VERSION};${plan.pace};${rows}`);
}

/** Unpack one, or nothing at all if it is not a plan. */
export function decodePlan(encoded: string): SharedPlan | null {
  try {
    const [version, pace, rows] = decode(encoded).split(';');
    if (version !== VERSION) return null;
    const hoursPerWeek = Number(pace);
    if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0) return null;

    const games = (rows ?? '')
      .split('|')
      .filter(Boolean)
      .map((row) => {
        const [name, hours] = row.split('~');
        return { name, hours: Number(hours) };
      })
      .filter((game) => game.name && Number.isFinite(game.hours));

    return games.length > 0 ? { pace: hoursPerWeek, games } : null;
  } catch {
    return null;
  }
}

/** What the sentence under a shared plan says. */
export function sharedSummary(plan: SharedPlan): string {
  const total = plan.games.reduce((sum, game) => sum + game.hours, 0);
  const weeks = Math.max(1, Math.round(total / plan.pace));
  return `${plan.games.length} ${
    plan.games.length === 1 ? 'game' : 'games'
  } · ${Math.round(total)} hours · about ${weeks} ${
    weeks === 1 ? 'week' : 'weeks'
  } at ${plan.pace}h a week`;
}
