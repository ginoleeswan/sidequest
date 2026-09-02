import type { ArtIO } from '../widgetArtIO';
import {
  artTargets,
  collectArt,
  fileName,
  hashOf,
  urlsFor,
  type ArtSource,
} from '../widgetArt';
import type { PlanDay } from '../widgetData';

const day = (
  tonight: number | null,
  nights: (number | null)[] = [],
  marks: number[] = []
): PlanDay => ({
  at: 0,
  tonight:
    tonight == null
      ? null
      : { id: tonight, title: `Game ${tonight}`, hours: 2, finishes: false },
  nights: nights.map((game, index) => ({
    day: 'MON',
    date: index + 1,
    title: game == null ? '' : `Game ${game}`,
    hours: game == null ? 0 : 2,
    finishes: false,
    colour: game == null ? -1 : 0,
    named: game != null,
    ...(game == null ? {} : { game }),
  })),
  horizon:
    marks.length === 0
      ? null
      : {
          from: 0,
          to: 1,
          now: 0,
          marks: marks.map((game) => ({
            name: `Game ${game}`,
            game,
            at: 0,
            label: 'Sep 1',
            colour: 0,
            done: false,
          })),
          troubleAt: null,
          troubleLabel: '',
          beyond: 0,
        },
  pressure: { urgency: 'calm', note: '', days: null },
});

const source = (id: number, extra: Partial<ArtSource> = {}): ArtSource => ({
  game: {
    id,
    slug: `game-${id}`,
    name: `Game ${id}`,
    released: '2020-01-01',
    background_image: `https://media.rawg.io/media/games/${id}/shot.jpg`,
  },
  cover: null,
  art: null,
  ...extra,
});

/** A container that remembers what was written and what was pruned. */
function fakeIO(present: string[] = []) {
  const files = new Set(present);
  const saved: [string, string][] = [];
  let kept: ReadonlySet<string> | null = null;
  const io: ArtIO = {
    has: (name) => files.has(name),
    save: async (name, url) => {
      saved.push([name, url]);
      files.add(name);
      return true;
    },
    prune: (keep) => {
      kept = keep;
      for (const name of Array.from(files))
        if (!keep.has(name)) files.delete(name);
    },
  };
  return { io, files, saved, kept: () => kept };
}

/**
 * Which games the widgets need pictures of, and which pictures — decided
 * here so the Swift side only ever reads names.
 */
describe('artTargets', () => {
  it('lists tonight’s leads in the order the week needs them, once each', () => {
    const { tonight } = artTargets([day(1), day(1), day(2), day(1)], null);
    expect(tonight).toEqual([1, 2]);
  });

  it('marks every game the week and the month name', () => {
    const { marks } = artTargets([day(1, [1, null, 2], [3, 2])], null);
    expect(marks).toEqual([1, 2, 3]);
  });

  it('shelves the latest credits first, six at most', () => {
    const blocks = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Game ${i + 1}`,
      hours: 5,
      month: i % 4,
    }));
    const { finished } = artTargets([], { blocks });
    expect(finished).toHaveLength(6);
    // March's games (month 3) before February's, later-listed first.
    expect(finished.slice(0, 2)).toEqual([8, 4]);
  });
});

describe('the pictures chosen for a game', () => {
  it('takes the publisher’s own art where SteamGridDB has it', () => {
    const asset = (url: string) => ({
      url,
      thumb: `${url}?thumb`,
      width: 1,
      height: 1,
      source: 'sgdb' as const,
      style: '',
    });
    const urls = urlsFor(
      source(1, {
        art: {
          logo: asset('https://cdn/logo.png'),
          hero: asset('https://cdn/hero.jpg'),
          grid: asset('https://cdn/grid.jpg'),
          icon: asset('https://cdn/icon.png'),
        },
      })
    );
    expect(urls.logo).toBe('https://cdn/logo.png?thumb');
    expect(urls.hero).toBe('https://cdn/hero.jpg?thumb');
    expect(urls.icon).toBe('https://cdn/icon.png');
    expect(urls.grid).toBe('https://cdn/grid.jpg?thumb');
  });

  it('falls back to RAWG’s screenshot for the hero, at the widget’s rung', () => {
    const urls = urlsFor(source(1));
    expect(urls.hero).toContain('/resize/1280/');
    expect(urls.logo).toBeUndefined();
    expect(urls.icon).toBeUndefined();
  });

  it('prefers IGDB’s box for the grid, and knows the file type', () => {
    const urls = urlsFor(source(1, { cover: 'co1abc' }));
    expect(urls.grid).toBe(
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg'
    );
    expect(fileName('grid', 1, urls.grid!)).toMatch(/^grid-1-[a-z0-9]+\.jpg$/);
  });

  it('names a changed picture differently', () => {
    expect(hashOf('a')).not.toBe(hashOf('b'));
    expect(fileName('logo', 1, 'https://x/a.png')).not.toBe(
      fileName('logo', 1, 'https://x/b.png')
    );
  });
});

describe('collectArt', () => {
  it('downloads what the container lacks and skips what it has', async () => {
    const heroName = fileName('hero', 1, urlsFor(source(1)).hero!);
    const { io, saved } = fakeIO([heroName]);
    const manifest = await collectArt(
      { tonight: [1], marks: [], finished: [] },
      async (id) => source(id),
      io
    );
    expect(saved).toEqual([]);
    expect(manifest).toEqual({ '1': { hero: heroName } });
  });

  it('prunes pictures the plan no longer names', async () => {
    const { io, files, kept } = fakeIO(['hero-9-stale.jpg']);
    await collectArt(
      { tonight: [1], marks: [], finished: [] },
      async (id) => source(id),
      io
    );
    expect(kept()?.has('hero-9-stale.jpg')).toBe(false);
    expect(files.has('hero-9-stale.jpg')).toBe(false);
  });

  it('leaves a game out when its download fails, and the rest in', async () => {
    const { io } = fakeIO();
    io.save = async (name) => !name.startsWith('grid-2');
    const manifest = await collectArt(
      { tonight: [], marks: [], finished: [1, 2] },
      async (id) => source(id, { cover: `co${id}` }),
      io
    );
    expect(Object.keys(manifest)).toEqual(['1']);
  });

  it('asks for nothing where there is nowhere to put it', async () => {
    const lookup = jest.fn(async (id: number) => source(id));
    const manifest = await collectArt(
      { tonight: [1], marks: [1], finished: [1] },
      lookup,
      null
    );
    expect(manifest).toEqual({});
    expect(lookup).not.toHaveBeenCalled();
  });

  it('shrugs off a lookup that throws', async () => {
    const { io } = fakeIO();
    const manifest = await collectArt(
      { tonight: [1, 2], marks: [], finished: [] },
      async (id) => {
        if (id === 1) throw new Error('offline');
        return source(id);
      },
      io
    );
    expect(Object.keys(manifest)).toEqual(['2']);
  });
});
