import type { Memcard } from './memcard';
import { yearShape, type PlanDay } from './widgetData';
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

/**
 * The widget `kind`s, matching the Swift `StaticConfiguration` strings.
 *
 * Exported for the contract test in `__tests__/widgetBridge`, which
 * reads the Swift and refuses any kind this table has not heard of.
 * That test exists because this table silently fell behind once: a
 * fourth widget shipped, nothing here knew its name, and the two
 * consequences were invisible from the JavaScript side — it was never
 * told a new plan had arrived, and, worse, it was never told to stop
 * showing an old one after somebody deleted their library.
 */
export const KINDS = {
  tonight: 'Tonight',
  week: 'ThisWeek',
  month: 'ThisMonth',
  year: 'TheYear',
} as const;

/**
 * Publish the week: every morning of it, already decided.
 *
 * A whole timeline rather than today's snapshot. The widget then shows
 * the right day without the app running, which is the only version of
 * this feature worth having — the previous shape wrote one entry and
 * asked to be reloaded at midnight, and the reload re-read the same
 * stale plan.
 *
 * The reload call is still what makes a NEW plan visible. A widget's
 * timeline is the system's to schedule, and without the nudge a plan
 * changed just now waits for whenever iOS next feels like asking,
 * which can be hours.
 */
export async function publishPlan(days: readonly PlanDay[]) {
  const bridge = widgetStore();
  if (!bridge) return;

  // Removed rather than written empty. The widget's own empty state is
  // better than a card claiming a game called "".
  if (days.length > 0) {
    bridge.store.set('plan', JSON.stringify(days));
  } else {
    bridge.store.remove('plan');
    // The art goes with it. A cover left behind outlives the plan that
    // asked for it, and the card it decorates now says "no plan yet" —
    // a game's key art behind those words is the widget contradicting
    // itself on somebody's home screen.
    bridge.store.remove('covers');
  }

  // Every widget drawn from `plan`, which is now three of the four.
  // The month reads the same key and was correct on paper; it simply
  // was never told, so a plan changed just now waited for whenever iOS
  // next felt like asking — hours, by this file's own reckoning.
  bridge.reload(KINDS.tonight);
  bridge.reload(KINDS.week);
  bridge.reload(KINDS.month);
}

/**
 * Publish the artwork, after the plan and separately from it.
 *
 * Two writes rather than one, deliberately. The plan is local and
 * instant; the covers are a download, and holding the week's text
 * hostage to a CDN would mean a widget showing last Tuesday's game
 * because a picture was slow. The card gets its words immediately and
 * its art when the art arrives, which is the order a reader would
 * choose if asked.
 *
 * Only Tonight is reloaded. It is the one widget that draws a cover —
 * the week is seven names and a month is a timeline, and neither gets
 * better for having photographs in it — so nudging the others would be
 * three wake-ups to redraw something that has not changed.
 */
export async function publishCovers(covers: Record<string, string>) {
  const bridge = widgetStore();
  if (!bridge) return;

  // Removed rather than written empty, the same as the plan: an empty
  // object is a thing Swift has to decode before finding out it holds
  // nothing.
  if (Object.keys(covers).length > 0) {
    bridge.store.set('covers', JSON.stringify(covers));
  } else {
    bridge.store.remove('covers');
  }
  bridge.reload(KINDS.tonight);
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
  // 'tonight' and 'week' are what builds before the timeline wrote;
  // cleared too, so an upgrade does not leave a copy of somebody's plan
  // in the container with nothing left that reads it.
  for (const key of ['plan', 'tonight', 'week', 'year', 'covers']) {
    bridge.store.remove(key);
  }
  // Removing the data is only half of forgetting. A widget holds a
  // rendered timeline of its own, so one that is never told to reload
  // goes on displaying a plan whose source has been deleted — which is
  // the promise above broken on the most public screen the reader has.
  for (const kind of Object.values(KINDS)) bridge.reload(kind);
}
