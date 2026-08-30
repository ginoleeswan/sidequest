/**
 * Getting a game's artwork to a process that cannot go and fetch it.
 *
 * A widget extension has no network worth using — a timeline is built
 * in the seconds the system grants it, on a schedule nobody controls,
 * often with the phone asleep — so anything a widget draws has to be
 * sitting in the container before it wakes. That makes artwork the same
 * kind of thing as the plan itself: decided by the app, written down,
 * read back cold.
 *
 * The container is UserDefaults, not a directory: ExtensionStorage can
 * put a string in, take one out and drop one, and does nothing else. So
 * a cover travels as base64 rather than as a file, and every decision
 * in here follows from that one constraint — keep them few, keep them
 * small, and never let a picture cost more than the plan it decorates.
 *
 * (Written without backticks on purpose. The icon subset is generated
 * by scanning quoted lowercase words out of this tree, comments
 * included, so naming a method that happens to share a name with an
 * Ionicon quietly adds a glyph to the font.)
 *
 * Nothing here is allowed to fail loudly. A cover that does not arrive
 * is a widget that looks the way it looked last week — a disappointment
 * of no consequence — while an exception thrown out of a publish is the
 * plan screen breaking because a CDN had a bad afternoon.
 */

import { mediaUri } from '@/api/rawg';
import { widgetStore } from './widgetStore';

/**
 * How much of the shared container artwork may occupy, in base64
 * characters — near enough to bytes for a budget.
 *
 * `UserDefaults` is a plist read whole every time the extension wakes,
 * which is the argument for a ceiling existing at all; a widget that
 * loads slowly because it is carrying a gallery has spent the thing it
 * was trying to buy. 200KB holds three or four covers at the size
 * below, which is a week of most plans.
 */
export const COVER_BUDGET = 200_000;

/**
 * The slot the artwork lands in, in CSS pixels.
 *
 * A small widget is about 158pt across; asking for that slot puts the
 * request on the 420px rung of the app's own ladder, which is
 * comfortably past retina for it and merely soft on the medium one.
 * That is the right trade when the art sits under a scrim with type
 * over it: detail is not what it is there for, recognition is, and
 * recognition survives being slightly soft.
 *
 * The rewrite itself belongs to `api/rawg`, which owns the ladder, the
 * doubling for retina and the rule about not rewriting a derivative
 * twice. This module knowing how to build the URL as well would be a
 * second copy of a rule, which is the thing every contract test in
 * this repo exists because of.
 */
const COVER_SLOT = 210;

/**
 * Fill a fixed budget from the front of a list.
 *
 * Priority is the caller's — `coverTargets` hands them over in the
 * order the week needs them — so spending from the front means the
 * cover that gets dropped is always the one furthest away. Tonight is
 * never the picture that did not fit.
 *
 * A single oversized cover is skipped rather than allowed to swallow
 * the whole allowance, and the ones behind it still get their turn.
 */
export function withinBudget(
  covers: readonly { id: number; data: string }[],
  budget = COVER_BUDGET
): Record<string, string> {
  const packed: Record<string, string> = {};
  let spent = 0;
  for (const cover of covers) {
    if (spent + cover.data.length > budget) continue;
    packed[String(cover.id)] = cover.data;
    spent += cover.data.length;
  }
  return packed;
}

/**
 * One image, as the string the container can hold.
 *
 * `FileReader` gives back a data URL and the widget wants only the
 * payload, so the prefix is cut here rather than on the far side —
 * Swift decoding base64 should be handed base64, not a MIME type it has
 * to know how to skip.
 */
export async function encodeCover(url: string): Promise<string | null> {
  try {
    const smaller = mediaUri(url, COVER_SLOT) ?? url;
    // The resized URL is a convention, not a contract: RAWG serves it
    // today and nothing obliges them to serve it tomorrow. When it does
    // not answer, the original is fetched instead rather than the game
    // silently losing its artwork — the budget downstream is what stops
    // a full-size press asset from taking the container with it.
    let response = await fetch(smaller);
    if (!response.ok && smaller !== url) response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const encoded = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
    if (!encoded) return null;
    const comma = encoded.indexOf(',');
    return comma < 0 ? null : encoded.slice(comma + 1);
  } catch {
    return null;
  }
}

/**
 * Everything the week needs, encoded once and kept.
 *
 * The publisher runs on every meaningful change to the library, and a
 * plan usually changes without its games changing — a corrected length,
 * a different pace, a new evening. Re-downloading the same three
 * pictures each time would be the module doing more work the more
 * carefully somebody tends their shelf.
 *
 * Keyed by URL rather than by game id, so a game whose artwork changes
 * is refetched and a game that merely moved in the route is not.
 */
const encoded = new Map<string, string>();

export async function collectCovers(
  targets: readonly number[],
  artOf: (id: number) => string | null | undefined
): Promise<Record<string, string>> {
  // Nowhere to put them is a reason not to fetch them. The publisher
  // runs on every platform and `publishCovers` already declines to
  // write on the ones without an app group — but declining after the
  // download means a browser spending a megabyte of somebody's
  // connection on pictures it is about to throw away.
  if (!widgetStore()) return {};

  const collected: { id: number; data: string }[] = [];
  for (const id of targets) {
    const url = artOf(id);
    if (!url) continue;
    const cached = encoded.get(url);
    if (cached) {
      collected.push({ id, data: cached });
      continue;
    }
    const data = await encodeCover(url);
    if (!data) continue;
    encoded.set(url, data);
    collected.push({ id, data });
  }
  return withinBudget(collected);
}

/** For tests, which must not inherit another test's downloads. */
export function forgetCovers() {
  encoded.clear();
}
