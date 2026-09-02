import type { GameArt as SgdbArt } from '@/api/art';
import { igdbCoverUri } from '@/api/igdb';
import { mediaUri } from '@/api/rawg';
import type { Game } from '@/api/types';
import type { Memcard } from './memcard';
import type { PlanDay } from './widgetData';
import { widgetArtIO, type ArtIO } from './widgetArtIO';

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
 * Four kinds, for four jobs. The HERO is the banner Tonight stands its
 * words on, and it is the shape a medium card is; the LOGO is the
 * publisher's own title treatment, drawn where the name was typed; the
 * ICON marks each evening of the week and each landing on the month;
 * the GRID is the box, for the shelf of finished games on the year's
 * card. Every one comes from the same art API the game page uses, so
 * the Lock Screen and the page show the same picture of the same game.
 *
 * The files live in the shared container; only a manifest of names
 * goes through the string store. See `widgetArtIO`.
 *
 * (Written without backticks on purpose. The icon subset is generated
 * by scanning quoted lowercase words out of this tree, comments
 * included.)
 */

export type ArtKind = 'hero' | 'logo' | 'icon' | 'grid';

/** What the container holds for one game: file names, by kind. */
export type GameArtFiles = Partial<Record<ArtKind, string>>;

/** By game id, as the Swift side reads it. */
export type ArtManifest = Record<string, GameArtFiles>;

/** Which games need which kinds, in the order they are needed. */
export interface ArtTargets {
  /** Tonight's leads across the week: hero and logo. */
  tonight: number[];
  /** Every game the week's rows and the month's marks name: icon. */
  marks: number[];
  /** The latest games finished this year: grid. */
  finished: number[];
}

/** How many boxes the year's shelf can show. */
export const SHELF = 6;

/**
 * Which games the widgets will need pictures of, and which pictures.
 *
 * Tonight's leads come first and in the order the week needs them, so
 * if anything is skipped it is the picture furthest away. The marks
 * are every named game across the week and the month; the finished
 * shelf is the year's most recent credits.
 */
export function artTargets(
  days: readonly PlanDay[],
  card: Pick<Memcard, 'blocks'> | null
): ArtTargets {
  const tonight: number[] = [];
  const marks: number[] = [];
  const seenTonight = new Set<number>();
  const seenMarks = new Set<number>();
  for (const day of days) {
    const lead = day.tonight?.id;
    if (lead != null && !seenTonight.has(lead)) {
      seenTonight.add(lead);
      tonight.push(lead);
    }
    for (const night of day.nights) {
      if (night.game != null && !seenMarks.has(night.game)) {
        seenMarks.add(night.game);
        marks.push(night.game);
      }
    }
    for (const mark of day.horizon?.marks ?? []) {
      if (mark.game != null && !seenMarks.has(mark.game)) {
        seenMarks.add(mark.game);
        marks.push(mark.game);
      }
    }
  }
  // Latest month first, then the order the card lists them in.
  const finished = (card?.blocks ?? [])
    .map((block, index) => ({ block, index }))
    .sort((a, b) => b.block.month - a.block.month || b.index - a.index)
    .slice(0, SHELF)
    .map(({ block }) => block.id);
  return { tonight, marks, finished };
}

/** A short, stable hash, so a changed URL is a changed file name. */
export function hashOf(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/** The file's extension from its URL, so the extension can read the type. */
function extensionOf(url: string): string {
  const match = /\.(png|jpe?g|webp|gif|ico)(?:$|[?#])/i.exec(url);
  return match ? match[1].toLowerCase() : 'img';
}

/** One picture's name in the container. */
export const fileName = (kind: ArtKind, id: number, url: string) =>
  `${kind}-${id}-${hashOf(url)}.${extensionOf(url)}`;

/** What is known about a game, for choosing its pictures. */
export interface ArtSource {
  game: Pick<Game, 'id' | 'slug' | 'name' | 'released' | 'background_image'>;
  /** IGDB's cover image id, where the app already knows it. */
  cover: string | null | undefined;
  /** What the art API answered, or null when it was not asked. */
  art: SgdbArt | null;
}

/**
 * The URL for each kind, from what is known.
 *
 * The hero falls back to the screenshot RAWG has for every game, at
 * the 640 rung: the card it grounds is a medium widget, two hundred
 * points across on a three-times screen. Nothing else falls back —
 * a logo that is not the publisher's is the typed name, which the
 * widget draws on its own; an icon that is not the game's is noise.
 */
export function urlsFor(source: ArtSource): Partial<Record<ArtKind, string>> {
  const urls: Partial<Record<ArtKind, string>> = {};
  const hero =
    source.art?.hero?.thumb ?? mediaUri(source.game.background_image, 640);
  if (hero) urls.hero = hero;
  if (source.art?.logo?.thumb) urls.logo = source.art.logo.thumb;
  if (source.art?.icon?.url) urls.icon = source.art.icon.url;
  const grid = source.cover
    ? igdbCoverUri(source.cover, 'cover_big')
    : source.art?.grid?.thumb;
  if (grid) urls.grid = grid;
  return urls;
}

/** Which kinds each target list wants. */
const KINDS_FOR: Record<keyof ArtTargets, ArtKind[]> = {
  tonight: ['hero', 'logo'],
  marks: ['icon'],
  finished: ['grid'],
};

/**
 * Everything the widgets need, on disk, and the manifest that says so.
 *
 * Downloads only what is not already there — the name carries the
 * URL's hash, so an unchanged picture costs nothing however often the
 * plan is republished — and prunes what the manifest no longer names,
 * so a game dropped from the week does not leave its art behind.
 *
 * `lookup` is asked once per game, in parallel a few at a time: the
 * art API is cached for a week upstream, and a plan names a dozen
 * games at most.
 */
export async function collectArt(
  targets: ArtTargets,
  lookup: (id: number) => Promise<ArtSource | null>,
  io: ArtIO | null = widgetArtIO()
): Promise<ArtManifest> {
  // Nowhere to put them is a reason not to fetch them.
  if (!io) return {};

  const wanted = new Map<number, Set<ArtKind>>();
  for (const list of Object.keys(KINDS_FOR) as (keyof ArtTargets)[]) {
    for (const id of targets[list]) {
      const kinds = wanted.get(id) ?? new Set<ArtKind>();
      for (const kind of KINDS_FOR[list]) kinds.add(kind);
      wanted.set(id, kinds);
    }
  }

  const manifest: ArtManifest = {};
  const keep = new Set<string>();
  const ids = Array.from(wanted.keys());
  const WIDTH = 4;
  for (let start = 0; start < ids.length; start += WIDTH) {
    await Promise.all(
      ids.slice(start, start + WIDTH).map(async (id) => {
        const source = await lookup(id).catch(() => null);
        if (!source) return;
        const urls = urlsFor(source);
        const files: GameArtFiles = {};
        for (const kind of wanted.get(id) ?? []) {
          const url = urls[kind];
          if (!url) continue;
          const name = fileName(kind, id, url);
          const present = io.has(name) || (await io.save(name, url));
          if (!present) continue;
          files[kind] = name;
          keep.add(name);
        }
        if (Object.keys(files).length > 0) manifest[String(id)] = files;
      })
    );
  }
  io.prune(keep);
  return manifest;
}
