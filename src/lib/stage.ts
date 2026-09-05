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
  /**
   * Today, on whichever slide leads. Its own field rather than a
   * clause welded onto the eyebrow: the reason is why this game is
   * here and the date is only proof the page is not stale, so they
   * are not the same sentence and must not be set in the same weight.
   */
  date?: string;
  /**
   * The game's name. Never a sentence with a verb in it: the verb is
   * already on the button, and a headline that says "Continue" over a
   * button that says "Continue it" spends the largest type on the page
   * repeating the smallest. It is also what lets the publisher's mark
   * stand in for the line on every slide rather than only on some.
   */
  title: string;
  /**
   * The number, if there is one — "2.5h left", "About 12h". Split from
   * the sentence because this app sets figures in figures everywhere
   * else, and buried mid-sentence in grey body copy the one fact the
   * reader came for was the quietest thing in the block.
   */
  figure?: string;
  /**
   * One sentence of substance under it — freshness, why, what it is.
   * A whole sentence on its own, so it reads either way: after the
   * figure with a separator between them, or alone on a slide that
   * has no figure to lead with.
   */
  detail: string;
  /** How far through, 0-1, for a game already under way. */
  progress?: number;
  /** Primary button label. */
  action: string;
}

export interface TonightPick {
  game: Game;
  hours: number;
  verb: 'Finish' | 'Continue' | 'Start';
  reason: string;
  /** How far through, 0-1, when the library knows. */
  progress?: number;
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

/**
 * Most slides a stage will ever show.
 *
 * Three was one per reason, and it read as a header with a couple of
 * alternates: the reader had seen the whole stage before they had
 * decided to look. Six is a carousel - two picks for each reason that
 * can supply two, and what everyone is playing filling the tail - and
 * still short enough that the dots stay countable and every slide is
 * one somebody chose rather than a feed.
 */
export const MAX_SLIDES = 6;

/** How many games one reason may put on the stage. */
const PER_REASON = { fresh: 2, short: 2 } as const;

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
 * came out this week, which beats what is merely short, which beats
 * what is merely popular. Each reason gets its picks in turn, so the
 * first three slides are still three different arguments and the
 * second of each comes after; popular fills whatever is left, labelled
 * as what it is. Each game appears at most once — the same cover twice
 * in one carousel is how the old one looked accidental.
 */
export function buildStage(input: StageInput): StageSlide[] {
  const slides: StageSlide[] = [];
  const used = new Set<number>();

  const take = (games: Game[]): Game | undefined =>
    games.find((game) => game && !used.has(game.id));

  if (input.tonight) {
    const { game, hours, verb, reason, progress } = input.tonight;
    used.add(game.id);
    slides.push({
      key: `tonight-${game.id}`,
      kind: 'tonight',
      game,
      eyebrow: 'Tonight',
      title: game.name,
      figure: hours > 0 ? `${formatHours(hours)} left` : '',
      detail: reason,
      progress,
      action: verb === 'Finish' ? 'Finish it' : `${verb} it`,
    });
  }

  const freshSlide = (fresh: Game): StageSlide => ({
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
    figure: hoursPhrase(fresh.playtime),
    detail: 'It just landed — nobody has finished it yet either.',
    action: 'Take a look',
  });
  const shortSlide = (short: Game): StageSlide => ({
    key: `short-${short.id}`,
    kind: 'short',
    game: short,
    eyebrow: 'Short enough to finish',
    title: short.name,
    figure: hoursPhrase(short.playtime),
    detail: 'A weekend, not a second job.',
    action: 'Take a look',
  });

  // Round by round, not reason by reason: the first fresh game, the
  // first short one, then the second of each. The stage opens on three
  // different arguments either way, and the repeats come after.
  for (
    let round = 0;
    round < Math.max(PER_REASON.fresh, PER_REASON.short);
    round++
  ) {
    if (round < PER_REASON.fresh) {
      const fresh = take(input.fresh);
      if (fresh && slides.length < MAX_SLIDES) {
        used.add(fresh.id);
        slides.push(freshSlide(fresh));
      }
    }
    if (round < PER_REASON.short) {
      const short = take(input.short);
      if (short && slides.length < MAX_SLIDES) {
        used.add(short.id);
        slides.push(shortSlide(short));
      }
    }
  }

  // Popular fills the tail. It is the weakest reason there is, so it
  // never leads a stage that has a stronger one - but a stage with two
  // slides and a shelf of what everyone is playing under it was holding
  // the games back for no reason anyone could see.
  while (slides.length < MAX_SLIDES) {
    const trending = take(input.trending);
    if (!trending) break;
    used.add(trending.id);
    slides.push({
      key: `trending-${trending.id}`,
      kind: 'trending',
      game: trending,
      eyebrow: 'Trending now',
      title: trending.name,
      figure: hoursPhrase(trending.playtime),
      detail: 'What everyone is playing right now.',
      action: 'Take a look',
    });
  }

  const stage = slides.slice(0, MAX_SLIDES);

  // The date belongs to the page, not to any one slide, so it rides on
  // whichever reason happens to lead. A storefront that cannot tell you
  // whether you are looking at it this morning or last month is the
  // cheapest kind of stale.
  if (stage.length > 0 && input.dateLabel) {
    stage[0] = { ...stage[0], date: input.dateLabel };
  }

  return stage;
}

/**
 * Which trailer the stage plays, out of what RAWG has.
 *
 * RAWG's list is unordered by purpose: for Grand Theft Auto V it opens
 * with eight GTA Online expansion trailers, and the first of them is a
 * French-subtitled DLC promo. A masthead wants the game's own trailer.
 * The game's name in the movie's title is the strongest sign; failing
 * that, anything that is not visibly an expansion, an update or a
 * season; failing that, the first, which is what it was.
 */
const EXPANSION_WORDS =
  /\b(dlc|update|expansion|season|online|pack|patch|bundle|edition)\b/i;

export function pickTrailer<T extends { name: string }>(
  movies: readonly T[],
  gameName: string
): T | null {
  if (movies.length === 0) return null;
  const game = gameName.toLowerCase();
  const named = movies.find((movie) => movie.name.toLowerCase().includes(game));
  if (named) return named;
  const plain = movies.find((movie) => !EXPANSION_WORDS.test(movie.name));
  return plain ?? movies[0];
}
