import { useEffect, useRef } from 'react';

import { usePersistedState } from '@/hooks/usePersistedState';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { buildMemcard } from '@/lib/memcard';
import { publishCovers, publishPlan, publishYear } from '@/lib/widgetBridge';
import { collectCovers } from '@/lib/widgetCovers';
import { coverTargets } from '@/lib/widgetData';
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

/**
 * How long an edit has to stop before it reaches the widgets.
 *
 * iOS meters widget reloads, and PRODUCT.md §6 makes a point of the
 * timeline sidestepping that budget — which it does not do if the app
 * spends the budget itself. Tidying a shelf or importing from Steam is
 * a burst of library writes, and each one would otherwise be two
 * reloads. Long enough to collapse a burst into one, short enough that
 * putting the phone down straight after a change still publishes it.
 */
const SETTLE_MS = 1_500;

export function WidgetPublisher() {
  const { entries } = useLibrary();
  const { durationOf, overrides } = useDurations();
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );

  /**
   * What was last handed over, so an unchanged plan is not re-sent.
   *
   * Several things here are rebuilt on every render and a few change
   * without changing what a widget would show — a re-fetched duration
   * that lands on the same number, a pace read back from storage. Each
   * of those would otherwise cost a write and two reloads for no
   * visible difference.
   */
  const published = useRef<{ plan: string; year: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Read per run rather than captured once: a `now` taken at mount
      // goes stale on a phone left open for days, and the timeline it
      // produced would start in the past.
      const now = Date.now();
      const all = Object.values(entries);
      const hoursOf = (entry: (typeof all)[number]) =>
        durationOf(entry.game).hours;

      const days = widgetPlan({
        entries: all,
        hoursOf,
        pace,
        windowWeeks,
        now,
      });
      const card = buildMemcard(
        all,
        (game) => durationOf(game).hours,
        new Date(now).getFullYear()
      );

      const plan = JSON.stringify(days);
      const year = JSON.stringify(card);
      const last = published.current;
      // The dates move every midnight even when nothing else does, so
      // the first publish after a day turns over is a real change.
      if (last?.plan === plan && last?.year === year) return;
      published.current = { plan, year };

      void publishPlan(days);
      void publishYear(card);

      /*
       * The artwork, chased after the words are already through.
       *
       * `publishPlan` has written and reloaded by now, so the card is
       * correct before this starts and merely plainer than it will be.
       * The library is the only place a cover URL exists — the plan
       * shapes carry ids and names, never assets — so the lookup
       * happens here rather than inside the bridge.
       *
       * Unawaited on purpose. Nothing on screen is waiting for a
       * picture, and an effect that resolves a network call is an
       * effect that can still be running when the next edit lands.
       */
      const art = new Map(
        all.map((entry) => [entry.game.id, entry.game.background_image])
      );
      void collectCovers(coverTargets(days), (id) => art.get(id)).then(
        publishCovers
      );
    }, SETTLE_MS);
    return () => clearTimeout(timer);
    // `overrides` is here because a corrected length changes every
    // number the widgets show while leaving the library untouched.
  }, [entries, overrides, durationOf, pace, windowWeeks]);

  return null;
}
