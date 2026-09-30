import type { Memcard } from './memcard';
import type { ArtManifest } from './widgetArt';
import type { PlanDay } from './widgetData';

/**
 * The web's widget bridge: nobody is on the other side of the door.
 *
 * There are no widgets in a browser and no app group to write them
 * into, so every call here has always returned at once — but the
 * bridge's real body pulls the plan shapes, the year shape and the
 * artwork collector in behind it, a few kilobytes of code for widgets
 * the web will never draw. The body lives in `widgetBridge.native.ts`;
 * this keeps the same four doors and answers each with nothing, the
 * way `widgetStore` and `widgetArtIO` already do.
 */
export async function publishPlan(_days: readonly PlanDay[]) {}

export async function publishArt(_manifest: ArtManifest) {}

export async function publishYear(_card: Memcard) {}

export async function clearWidgets() {}
