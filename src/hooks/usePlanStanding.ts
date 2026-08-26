import { useMemo, useState } from 'react';

import { usePersistedState } from './usePersistedState';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { planItems } from '@/lib/planning';
import { planSchedule } from '@/lib/scheduler';

/**
 * Where one game stands in your plan.
 *
 * The game page could say a great deal about a game and nothing about
 * YOUR game. It answered "about 3 weeks at 8h a week", which is true of
 * anybody with that pace, while the plan page two taps away knew the
 * actual answer — third in the route, credits around 5 September — and
 * the two never spoke. That is the same drift the widgets had: one
 * truth, told two ways by two surfaces, or told by only one of them.
 *
 * So the rule lives here and both callers read it. Built from the
 * library through `planItems` and `planSchedule`, exactly as the plan
 * page and the widgets build it, because a game page that disagreed
 * with the plan about its own game would be worse than one that stayed
 * quiet.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type PlanStanding =
  /** In the route, with a projected date. */
  | { kind: 'scheduled'; finishAt: number; position: number }
  /** In the library, but the window has no room for it. */
  | { kind: 'dropped' }
  /** Not in the library at all, or finished, or of unknown length. */
  | null;

export function usePlanStanding(gameId: number | undefined): PlanStanding {
  const { entries } = useLibrary();
  const { durationOf } = useDurations();
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );
  // Captured once per visit: a stable "now" keeps render pure and the
  // projected date steady while the page is open.
  const [now] = useState(() => Date.now());

  return useMemo(() => {
    if (gameId == null) return null;
    const schedule = planSchedule(
      planItems(
        Object.values(entries),
        (entry) => durationOf(entry.game).hours
      ),
      {
        hoursPerWeek: pace,
        now,
        deadline: windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
      }
    );

    const at = schedule.scheduled.findIndex((item) => item.id === gameId);
    if (at >= 0) {
      return {
        kind: 'scheduled',
        finishAt: schedule.scheduled[at].finishAt,
        position: at,
      };
    }
    if (schedule.dropped.some((item) => item.id === gameId)) {
      return { kind: 'dropped' };
    }
    return null;
  }, [gameId, entries, durationOf, pace, windowWeeks, now]);
}
