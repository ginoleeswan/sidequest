import { mediaUri } from '../rawg';

/**
 * Native and dev builds skip the proxy, so these assert the derivative
 * rewriting rather than the host swap — the part that decides how many
 * megabytes a page pulls.
 */
const COVER = 'https://media.rawg.io/media/games/511/5118aff.jpg';
const SHOT = 'https://media.rawg.io/media/screenshots/f95/f9518b1.jpg';

describe('mediaUri', () => {
  it('passes a URL through untouched when no slot width is given', () => {
    expect(mediaUri(COVER)).toBe(COVER);
  });

  it('handles nothing to show', () => {
    expect(mediaUri(null)).toBeUndefined();
    expect(mediaUri(undefined)).toBeUndefined();
    expect(mediaUri('')).toBeUndefined();
  });

  it('asks for a derivative sized to the slot', () => {
    expect(mediaUri(COVER, 320)).toBe(
      'https://media.rawg.io/media/resize/640/-/games/511/5118aff.jpg'
    );
  });

  it('doubles the slot width for retina, then rounds up the ladder', () => {
    // 100 → wants 200 → an exact rung.
    expect(mediaUri(COVER, 100)).toContain('/resize/200/-/');
    // 320 → wants 640 → an exact rung.
    expect(mediaUri(COVER, 320)).toContain('/resize/640/-/');
    // 250 → wants 500 → rounds up to the next rung the CDN will serve.
    expect(mediaUri(COVER, 250)).toContain('/resize/640/-/');
  });

  /**
   * The guard that matters. RAWG 404s an off-list width rather than
   * falling back to the original, so a slot width that produced, say,
   * 320 would ship a broken image — silently, and only in production.
   */
  it('never emits a width the CDN will not serve', () => {
    const SERVED = [200, 420, 640, 1280, 1920];
    for (let slot = 1; slot <= 2000; slot += 1) {
      const url = mediaUri(COVER, slot);
      const width = Number(url?.match(/\/resize\/(\d+)\/-\//)?.[1]);
      expect(SERVED).toContain(width);
    }
  });

  it('caps at the largest rung rather than inventing a width', () => {
    expect(mediaUri(COVER, 4000)).toContain('/resize/1920/-/');
  });

  it('resizes screenshots as well as covers', () => {
    expect(mediaUri(SHOT, 320)).toBe(
      'https://media.rawg.io/media/resize/640/-/screenshots/f95/f9518b1.jpg'
    );
  });

  it('leaves an already-resized URL alone rather than nesting derivatives', () => {
    const already =
      'https://media.rawg.io/media/resize/640/-/games/511/5118aff.jpg';
    expect(mediaUri(already, 320)).toBe(already);
    const cropped =
      'https://media.rawg.io/media/crop/600/400/games/511/5118aff.jpg';
    expect(mediaUri(cropped, 320)).toBe(cropped);
  });

  it('leaves a URL with no /media/ segment alone', () => {
    const odd = 'https://example.com/cover.jpg';
    expect(mediaUri(odd, 320)).toBe(odd);
  });
});
