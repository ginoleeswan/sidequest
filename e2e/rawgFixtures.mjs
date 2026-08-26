/**
 * A RAWG that always answers, for looking at screens with data on them.
 *
 * Everything else in e2e blocks RAWG, deliberately: hydration is
 * decided before any request resolves, so those checks need no API and
 * cannot flake on someone else's uptime. The cost of that discipline
 * was that no automated check had ever seen the data-full render of
 * any screen — the game page had shipped every change blind, and the
 * empty states were the only states anything looked at.
 *
 * These are the answers `e2e/data.mjs` serves in RAWG's place. Static,
 * tiny, and shaped exactly like the real payloads — field names copied
 * from `src/api/types.ts`, not invented. Artwork is a one-pixel data
 * URI: the layout cares that an image arrives, never what it shows.
 */

/** One dark pixel. What the art looks like is not what is under test. */
const ART =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNiOMr7HwAFHQJ+lHYSXwAAAABJRU5ErkJggg==';

const game = (id, name, playtime, released) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  background_image: ART,
  rating: 4.5,
  rating_top: 5,
  released,
  playtime,
  metacritic: 93,
  parent_platforms: [{ platform: { id: 1, name: 'PC', slug: 'pc' } }],
  genres: [
    { id: 1, name: 'Action', slug: 'action' },
    { id: 2, name: 'Roguelike', slug: 'roguelike' },
  ],
  short_screenshots: [],
});

const series = [
  game(2, 'Bastion', 8, '2011-07-20'),
  game(3, 'Transistor', 7, '2014-05-20'),
  game(4, 'Pyre', 10, '2017-07-25'),
];

const detail = {
  ...game(3498, 'Hades', 21, '2020-09-17'),
  description:
    '<p>A rogue-like dungeon crawler in which you defy the god of the dead as you hack and slash your way out of the Underworld of Greek myth.</p>',
  website: 'https://www.supergiantgames.com/games/hades',
  esrb_rating: { id: 3, name: 'Teen' },
  ratings: [
    { id: 5, title: 'exceptional', count: 2101, percent: 74.4 },
    { id: 4, title: 'recommended', count: 561, percent: 19.9 },
    { id: 3, title: 'meh', count: 118, percent: 4.2 },
    { id: 1, title: 'skip', count: 44, percent: 1.5 },
  ],
  added_by_status: { owned: 9000, beaten: 3400, toplay: 2100, playing: 900 },
  stores: [
    {
      id: 1,
      store: {
        id: 1,
        name: 'Steam',
        slug: 'steam',
        domain: 'store.steampowered.com',
      },
    },
  ],
  platforms: [{ platform: { id: 1, name: 'PC', slug: 'pc' } }],
  developers: [{ id: 9, name: 'Supergiant Games', slug: 'supergiant-games' }],
  publishers: [{ id: 9, name: 'Supergiant Games', slug: 'supergiant-games' }],
  tags: [{ id: 31, name: 'Singleplayer', slug: 'singleplayer' }],
};

/**
 * A deep bench of extras, because the storefront needs one.
 *
 * The home page passes a single `seen` set down all of its rows so no
 * two shelves offer the same game (see `dedupeGames`). Against a
 * three-game fixture that is starvation, not deduplication: the first
 * row takes everything and every row under it renders empty, so the
 * whole page falls to "Nothing here yet" — a blank storefront that
 * looks exactly like a real regression and is not one.
 *
 * RAWG returns forty a page. So does this. The named three stay at the
 * front, because other scenarios read them by name.
 */
const bench = Array.from({ length: 40 }, (_, i) =>
  game(
    9000 + i,
    `Bench Game ${i + 1}`,
    // A spread of lengths, so the length-window shelves ("short enough
    // to finish", "under 8 hours") have something to select.
    2 + (i % 24),
    `20${10 + (i % 15)}-06-01`
  )
);

const page = (results) => ({ count: results.length, next: null, results });

/**
 * The answer for one proxied path, or null for anything unrecognised.
 *
 * Unrecognised deliberately returns null rather than an empty page, so
 * the caller can abort the request and a screen quietly leaning on an
 * endpoint nobody thought about shows up as its loading state in the
 * screenshots rather than passing by accident.
 */
export function rawgFixture(path) {
  if (/^games\/\d+\/screenshots$/.test(path))
    return page([1, 2, 3, 4].map((id) => ({ id, image: ART })));
  if (/^games\/\d+\/movies$/.test(path)) return page([]);
  if (/^games\/\d+\/game-series$/.test(path)) return page(series);
  if (/^games\/\d+\/stores$/.test(path))
    return page([
      { id: 1, store_id: 1, url: 'https://store.steampowered.com/app/1145360' },
    ]);
  if (/^games\/\d+$/.test(path)) return detail;
  if (path === 'games' || path.startsWith('games?'))
    return page(series.concat([detail], bench));
  if (path.startsWith('collections/'))
    // Feed shape, not game shape: a result here is a post that CARRIES
    // a game. The onboarding read `item.game` from day one and a flat
    // list decoded to a screen with no tiles — a bug the unit tests
    // already caught once, which is exactly why the fixture must not
    // reintroduce the wrong shape here.
    return page(series.map((item) => ({ id: item.id, game: item })));
  return page([]);
}
