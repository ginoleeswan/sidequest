import type { Game } from '@/api/types';
import type { LibraryEntry } from '../library';
import { seriesCandidates, seriesNews } from '../series';

const NOW = Date.UTC(2026, 7, 20);
const DAY = 24 * 60 * 60 * 1000;
const iso = (days: number) =>
  new Date(NOW + days * DAY).toISOString().slice(0, 10);

const game = (id: number, name: string, released?: string) =>
  ({ id, name, released }) as Game;

const entry = (
  id: number,
  name: string,
  status: LibraryEntry['status'] = 'finished',
  finishedAt = NOW
): LibraryEntry => ({
  game: game(id, name),
  status,
  addedAt: NOW - 100 * DAY,
  finishedAt,
});

/**
 * The only news this app can honestly deliver: it comes from release
 * dates and your own library, not a feed somebody else curates.
 */
describe('series news', () => {
  const finished = entry(1, 'Hades');

  it('tells you the sequel is out', () => {
    const news = seriesNews(
      finished,
      [game(2, 'Hades II', iso(-3))],
      [finished],
      NOW
    );
    expect(news[0].message).toBe('You finished Hades. Hades II is out.');
    expect(news[0].kind).toBe('out');
  });

  it('counts down to one that has not landed', () => {
    const news = seriesNews(
      finished,
      [game(2, 'Hades II', iso(12))],
      [finished],
      NOW
    );
    expect(news[0].message).toBe(
      'You finished Hades. Hades II lands in 12 days.'
    );
    expect(news[0].kind).toBe('soon');
  });

  it('says nothing about a game you already saved', () => {
    const saved = entry(2, 'Hades II', 'wishlist');
    expect(
      seriesNews(
        finished,
        [game(2, 'Hades II', iso(-3))],
        [finished, saved],
        NOW
      )
    ).toEqual([]);
  });

  it('says nothing about old news', () => {
    expect(
      seriesNews(finished, [game(2, 'Hades II', iso(-400))], [finished], NOW)
    ).toEqual([]);
  });

  it('says nothing about a release years away', () => {
    expect(
      seriesNews(finished, [game(2, 'Hades III', iso(900))], [finished], NOW)
    ).toEqual([]);
  });

  it('ignores a game with no date at all', () => {
    expect(
      seriesNews(finished, [game(2, 'Untitled')], [finished], NOW)
    ).toEqual([]);
  });

  it('leads with whichever is closest to now', () => {
    const news = seriesNews(
      finished,
      [game(2, 'Far', iso(90)), game(3, 'Near', iso(-2))],
      [finished],
      NOW
    );
    expect(news.map((n) => n.game.name)).toEqual(['Near', 'Far']);
  });
});

describe('which games to ask about', () => {
  it('asks about what was finished most recently', () => {
    const candidates = seriesCandidates([
      entry(1, 'Old', 'finished', NOW - 300 * DAY),
      entry(2, 'Recent', 'finished', NOW - DAY),
      entry(3, 'Still playing', 'playing'),
    ]);
    expect(candidates.map((c) => c.game.name)).toEqual(['Recent', 'Old']);
  });

  it('asks about a few, because each one is a request', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      entry(i, `Game ${i}`, 'finished', NOW - i * DAY)
    );
    expect(seriesCandidates(many)).toHaveLength(4);
  });
});
