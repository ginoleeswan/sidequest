import { useEffect } from 'react';

import { usePersistedState } from '@/hooks/usePersistedState';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { buildMemcard } from '@/lib/memcard';
import { publishPlan, publishYear } from '@/lib/widgetBridge';
import { widgetPlan } from '@/lib/widgetPlan';

/**
 * Keeps the widgets current, from the root, on change.
 *
 * They used to be published from the screens that happened to show the
 * same information: the plan from `WeekView`, the year card from the
 * memcard screen. That made updating a widget a side effect of looking
 * at it — finish a game and the year card would not change until you
 * went to admire it — so the widget was stalest exactly when somebody
 * was using the app least, which is the state it exists for.
 *
 * Mounted once, above the router, it watches the stores instead. A plan
 * is made of the library, the corrections and the pace; when one of
 * those moves, the week ahead is worked out again and handed over.
 *
 * All of the work happens in the effect rather than in the render. Not
 * only because the clock has to be read and reading it while rendering
 * is impure — but because none of this is for the screen. Nothing here
 * is drawn, so nothing here belongs on the path that draws.
 *
 * Renders nothing, and is allowed to do nothing: on web and in any
 * build without the app group, `widgetStore()` is null and every call
 * below returns immediately.
 */
export function WidgetPublisher() {
  const { entries } = useLibrary();
  const { durationOf, overrides } = useDurations();
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );

  useEffect(() => {
    // Read per run rather than captured once: a `now` taken at mount
    // goes stale on a phone left open for days, and the timeline it
    // produced would start in the past.
    const now = Date.now();
    const all = Object.values(entries);
    const hoursOf = (entry: (typeof all)[number]) =>
      durationOf(entry.game).hours;

    void publishPlan(
      widgetPlan({ entries: all, hoursOf, pace, windowWeeks, now })
    );
    void publishYear(
      buildMemcard(
        all,
        (game) => durationOf(game).hours,
        new Date(now).getFullYear()
      )
    );
    // `overrides` is here because a corrected length changes every
    // number the widgets show while leaving the library untouched.
  }, [entries, overrides, durationOf, pace, windowWeeks]);

  return null;
}
