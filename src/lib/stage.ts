import type { Game } from '@/api/types';
import { formatHours } from './duration';

/**
 * The top of the home page.
 *
 * The old carousel showed five games with their name, star and year —
 * the same five for everyone, and no answer to "why am I looking at
 * this". A stage slide has to earn its place by carrying a reason. If
 * there is nothing to say about a game beyond it existing, it belongs in
 * a shelf further down, not at the top of the page.
 */

export type StageKind = 'tonight' | 'fresh' | 'short' | 'trending';

export interface StageSlide {
  key: string;
  kind: StageKind;
  game: Game;
  /** Small caps line above the title: the reason this is here. */
  eyebrow: string;
  /** The argument. For a pick from the library this is a sentence. */
  title: string;
  /** One line of substance under it — length, freshness, why. */
  detail: string;
  /** Primary button label. */
  action: string;
}

export interface TonightPick {
  game: Game;
  hours: number;
  verb: 'Finish' | 'Continue' | 'Start';
  reason: string;
}

export interface StageInput {
  /** The library's answer, when it has one. Always the first slide. */
  tonight: TonightPick | null;
  /** Out this week, freshest first. */
  fresh: Game[];
  /** Anything already loaded that is short enough to finish. */
  short: Game[];
  /** The fallback: what everyone is playing. */
  trending: Game[];
  /** How many games released today, for the freshness eyebrow. */
  outToday: number;
  /** "Thursday, 20 August", or '' before hydration knows the date. */
  dateLabel: string;
}

/** Most slides a stage will ever show. Three reasons is plenty. */
export const MAX_SLIDES = 3;

/**
 * How tall the stage is, given the window.
 *
 * Tall enough that the first screen is one picture rather than the top
 * third of a shelf, capped so a desktop monitor doesn't get a billboard,
 * and floored so a short laptop window still has a stage.
 *
 * Shared with the loading skeleton, which has to occupy the same pixels
 * the stage will. It was a separate hard-coded number there, and the two
 * drifted 117 pixels apart the moment this one changed.
 */
/**
 * How much of the window the stage takes.
 *
 * A phone gets two thirds: there is nothing beside the hero, so the
 * first screen may as well be one picture. A desktop gets barely half,
 * because the sidebar is already competing for attention and a hero at
 * the phone's proportion left no room for the first shelf — the page
 * looked like it ended at the fold. Half puts the top of "Finish it
 * this weekend" on screen, which is what says there is more here.
 */
export const STAGE_BOUNDS = {
  min: 380,
  max: 620,
  ratio: 0.66,
  /**
   * Taller on a desk than it was. At 0.52 of a 900px window the stage
   * was a 2.6:1 letterbox - the art's subject cropped out top and
   * bottom, the copy jammed against the lower edge. 0.62 lands near
   * the 16:7 the streaming mastheads use: room for the picture to be
   * a picture and for the copy to sit inside it rather than on its rim.
   */
  expandedRatio: 0.62,
  expandedMin: 460,
} as const;

export function stageHeight(windowHeight: number, isExpanded: boolean): number {
  const { min, max, ratio, expandedRatio, expandedMin } = STAGE_BOUNDS;
  const wanted = windowHeight * (isExpanded ? expandedRatio : ratio);
  return Math.round(
    Math.min(Math.max(wanted, isExpanded ? expandedMin : min), max)
  );
}

const hoursPhrase = (hours: number): string =>
  hours > 0 ? `About ${formatHours(hours)}` : '';

/**
 * Build the stage.
 *
 * Order is by strength of claim: what your own library says beats what
 * came out today, which beats what is merely short, which beats what is
 * merely popular. Each game appears at most once — the same cover twice
 * in one carousel is how the old one looked accidental.
 */
export function buildStage(input: StageInput): StageSlide[] {
  const slides: StageSlide[] = [];
  const used = new Set<number>();
  let fellBack = false;

  const take = (games: Game[]): Game | undefined =>
    games.find((game) => game && !used.has(game.id));

  if (input.tonight) {
    const { game, hours, verb, reason } = input.tonight;
    used.add(game.id);
    slides.push({
      key: `tonight-${game.id}`,
      kind: 'tonight',
      game,
      eyebrow: 'Tonight',
      title: `${verb} ${game.name}`,
      detail: hours > 0 ? `${formatHours(hours)} left. ${reason}` : reason,
      action: verb === 'Finish' ? 'Finish it' : `${verb} it`,
    });
  }

  const fresh = take(input.fresh);
  if (fresh) {
    used.add(fresh.id);
    const length = hoursPhrase(fresh.playtime);
    slides.push({
      key: `fresh-${fresh.id}`,
      kind: 'fresh',
      game: fresh,
      eyebrow:
        input.outToday > 0
          ? input.outToday === 1
            ? '1 game out today'
            : `${input.outToday} games out today`
          : 'Out this week',
      title: fresh.name,
      detail: length
        ? `${length}, and it just landed.`
        : 'It just landed — nobody has finished it yet either.',
      action: 'Take a look',
    });
  }

  const short = take(input.short);
  if (short && slides.length < MAX_SLIDES) {
    used.add(short.id);
    slides.push({
      key: `short-${short.id}`,
      kind: 'short',
      game: short,
      eyebrow: 'Short enough to finish',
      title: short.name,
      detail: `${hoursPhrase(short.playtime)} — a weekend, not a second job.`,
      action: 'Take a look',
    });
  }

  // Only if nothing above had anything to say. A stage with no slides is
  // worse than a popular game with an honest label — but "popular" is a
  // weak enough reason that it never joins a stage that already has one.
  while (slides.length === 0 || (fellBack && slides.length < MAX_SLIDES)) {
    const trending = take(input.trending);
    if (!trending) break;
    fellBack = true;
    used.add(trending.id);
    slides.push({
      key: `trending-${trending.id}`,
      kind: 'trending',
      game: trending,
      eyebrow: 'Trending now',
      title: trending.name,
      detail: hoursPhrase(trending.playtime)
        ? `${hoursPhrase(trending.playtime)}, and everyone is playing it.`
        : 'What everyone is playing right now.',
      action: 'Take a look',
    });
  }

  const stage = slides.slice(0, MAX_SLIDES);

  // The date belongs to the page, not to any one slide, so it rides on
  // whichever reason happens to lead. A storefront that cannot tell you
  // whether you are looking at it this morning or last month is the
  // cheapest kind of stale.
  if (stage.length > 0 && input.dateLabel) {
    stage[0] = {
      ...stage[0],
      eyebrow: `${input.dateLabel} · ${stage[0].eyebrow}`,
    };
  }

  return stage;
}
