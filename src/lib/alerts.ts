import { hoursLeft } from './planning';
import type { LibraryEntry } from './library';

/**
 * The things worth saying out loud when someone opens the app.
 *
 * Not notifications. Real push needs a server to send from and a native
 * build to receive on, and neither exists yet — so rather than a
 * permission prompt that leads nowhere, these are computed on open and
 * shown in the plan. Everything here is something a person would want
 * to be told and cannot work out at a glance.
 *
 * Pure: (entries, hours, pace, now) in, alerts out.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Past this, a deadline is not news yet. */
/**
 * How far ahead a deadline is worth mentioning.
 *
 * Exported because the widget's ring is drawn against it: a deadline
 * at the horizon is a full circle and the day itself is an empty one,
 * and that only reads correctly if both sides agree what the horizon
 * is.
 */
export const HORIZON_DAYS = 21;

/** Close enough to the end that one evening finishes it. */
const NEARLY_DONE_HOURS = 2;

export type AlertKind = 'at-risk' | 'due-soon' | 'nearly-done';

export interface Alert {
  kind: AlertKind;
  gameId: number;
  name: string;
  /** The sentence itself, already in the app's voice. */
  message: string;
  /** Days until the deadline, when there is one. */
  days?: number;
  /** Hours of play still to do. */
  hoursLeft: number;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const round = (hours: number) => Math.max(1, Math.round(hours));

/**
 * What to say, in order of how much it matters.
 *
 * A deadline that cannot be met comes first — it is the only one where
 * doing nothing is the wrong answer. Then deadlines that can. Then the
 * games sitting an evening from their credits, which is the app's
 * favourite thing to point out.
 */
export function buildAlerts(
  entries: LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number,
  hoursPerWeek: number,
  now: number = Date.now(),
  limit = 3
): Alert[] {
  const alerts: Alert[] = [];

  for (const entry of entries) {
    if (entry.status === 'finished') continue;

    const left = hoursLeft(entry, hoursOf);
    if (left <= 0) continue;

    const name = entry.game.name;

    if (entry.deadline != null) {
      const days = Math.ceil((entry.deadline - now) / DAY);
      if (days <= HORIZON_DAYS) {
        // Hours of play there are actually room for before the date.
        const capacity = Math.max(0, (days / 7) * hoursPerWeek);
        if (left > capacity) {
          alerts.push({
            kind: 'at-risk',
            gameId: entry.game.id,
            name,
            days,
            hoursLeft: left,
            message:
              days <= 0
                ? `${name} is past the date you set. Let it go, or give it a new one.`
                : `${name} needs ${round(left)}h and there is only room for about ${round(
                    capacity
                  )}h before your date. Move the date, or let it go — both are allowed.`,
          });
          continue;
        }
        alerts.push({
          kind: 'due-soon',
          gameId: entry.game.id,
          name,
          days,
          hoursLeft: left,
          message: `${name} is due in ${plural(days, 'day', 'days')} and needs about ${round(
            left
          )}h. That fits.`,
        });
        continue;
      }
    }

    if (left <= NEARLY_DONE_HOURS && entry.status === 'playing') {
      alerts.push({
        kind: 'nearly-done',
        gameId: entry.game.id,
        name,
        hoursLeft: left,
        message: `${name} is about ${round(left)}h from the credits. That is one evening.`,
      });
    }
  }

  const rank: Record<AlertKind, number> = {
    'at-risk': 0,
    'due-soon': 1,
    'nearly-done': 2,
  };

  return alerts
    .sort(
      (a, b) =>
        rank[a.kind] - rank[b.kind] ||
        (a.days ?? Infinity) - (b.days ?? Infinity) ||
        a.hoursLeft - b.hoursLeft
    )
    .slice(0, limit);
}
