import type { Memcard } from './memcard';
import type { PlannedEvening } from './week';
import { tonightShape, weekShape, yearShape } from './widgetData';
import { widgetStore } from './widgetStore';

/**
 * The one door between the app and its widgets.
 *
 * The widgets live in a separate process that cannot call into
 * JavaScript, so everything they show has to be written into the shared
 * app-group container and read back cold. This module is the only place
 * that writes to it — `widgetData` decides the shapes and is pure and
 * tested; this puts them through the door and knocks.
 *
 * Written as JSON strings rather than as separate keys, and that is
 * load-bearing. A widget woken halfway through the app writing six
 * defaults would render a title from this week against an hour count
 * from last; one string decoded whole is either the new plan or the old
 * one, never half of each.
 *
 * Every call is best-effort. A widget that fails to update is a stale
 * widget, which is a small disappointment; an exception thrown into the
 * plan screen because a device had no app group is a broken app. There
 * is nothing here a reader is waiting for, so nothing here may fail
 * loudly.
 */

/** The widget `kind`s, matching the Swift `StaticConfiguration` strings. */
const KINDS = {
  tonight: 'Tonight',
  week: 'ThisWeek',
  year: 'TheYear',
} as const;

/**
 * Publish the plan: tonight, and the week it sits in.
 *
 * Called wherever the schedule is known and whenever it changes. The
 * reload is what makes it visible — a widget's timeline is the system's
 * to schedule, and without the nudge the new plan waits for whenever
 * iOS next feels like asking, which can be hours.
 */
export async function publishPlan(week: readonly PlannedEvening[]) {
  const bridge = widgetStore();
  if (!bridge) return;

  const tonight = tonightShape(week);
  // Removed rather than written empty. The widget's own empty state is
  // better than a card claiming a game called "".
  if (tonight) {
    bridge.store.set('tonight', JSON.stringify(tonight));
  } else {
    bridge.store.remove('tonight');
  }
  bridge.store.set('week', JSON.stringify(weekShape(week)));

  bridge.reload(KINDS.tonight);
  bridge.reload(KINDS.week);
}

/** Publish the year's card — the twelve slots and what fills them. */
export async function publishYear(card: Memcard) {
  const bridge = widgetStore();
  if (!bridge) return;
  bridge.store.set('year', JSON.stringify(yearShape(card)));
  bridge.reload(KINDS.year);
}

/**
 * Forget everything.
 *
 * The app's promise is that its data is the reader's to delete, and the
 * app group is a second copy of it living outside the app's own
 * storage. Anything that clears the library has to clear this too, or
 * the plan outlives the plan.
 */
export async function clearWidgets() {
  const bridge = widgetStore();
  if (!bridge) return;
  for (const key of ['tonight', 'week', 'year']) bridge.store.remove(key);
  for (const kind of Object.values(KINDS)) bridge.reload(kind);
}
