import { BAND_CROP, BAND_SHARE, bannerHeight } from '../detailHero';

/** The picture, without the status bar's share of the band. */
const picture = (w: number, h: number, top = 0) =>
  bannerHeight(w, top, h) - top;

/**
 * The masthead's one measurement, and the two things it has to hold at
 * once: a band that feels the same on every phone, and a crop no hero
 * can be asked to survive twice.
 */
describe('how tall the band is', () => {
  it('adds the status bar rather than taking it out of the picture', () => {
    expect(bannerHeight(390, 59, 844)).toBe(picture(390, 844) + 59);
  });

  /**
   * The fault a flat ratio had: at 1.8 the picture was 31% of an iPhone
   * SE and 26% of a Pro Max, so one design read as a stage on a small
   * phone and a header image on a large one.
   */
  it('holds near a third of the window across every phone', () => {
    const phones: [number, number][] = [
      [375, 667],
      [390, 844],
      [402, 874],
      [430, 932],
    ];
    for (const [w, h] of phones) {
      const share = picture(w, h) / h;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThanOrEqual(BAND_SHARE + 0.001);
    }
  });

  it('never crops a hero past the limit, however tall the window', () => {
    expect(picture(390, 2000)).toBe(Math.round(390 / BAND_CROP.tightest));
  });

  it('keeps a band rather than a strip when the window is short', () => {
    expect(picture(390, 300)).toBe(Math.round(390 / BAND_CROP.widest));
  });

  /**
   * A pre-render has measured nothing. Falling to the floor keeps the
   * bones the size of a band, so the swap stays a dissolve.
   */
  it('falls to the floor when nothing has been measured', () => {
    expect(picture(390, 0)).toBe(Math.round(390 / BAND_CROP.widest));
  });
});
