import { previewUri } from '../CoverImage';

/**
 * The tiny cut a frame paints while its cover arrives: the same picture
 * from the same host, at a size that comes back in a fraction of the
 * time — or nothing, for hosts that do not serve cuts.
 */
describe('previewUri', () => {
  it('asks RAWG for its smallest resize of the same asset', () => {
    expect(
      previewUri('https://media.rawg.io/media/resize/640/-/games/a/b.jpg')
    ).toBe('https://media.rawg.io/media/resize/200/-/games/a/b.jpg');
    expect(
      previewUri('https://media.rawg.io/media/crop/600/400/games/a/b.jpg')
    ).toBe('https://media.rawg.io/media/resize/200/-/games/a/b.jpg');
  });

  it('asks IGDB for the small cut of the same kind', () => {
    expect(
      previewUri(
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg'
      )
    ).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small/co1.jpg');
    expect(
      previewUri('https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg')
    ).toBe(
      'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1.jpg'
    );
  });

  it('has nothing for hosts without cuts', () => {
    expect(previewUri('https://cdn2.steamgriddb.com/grid/a.png')).toBeNull();
  });
});
