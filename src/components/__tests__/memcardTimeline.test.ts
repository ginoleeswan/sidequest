import { buildTimeline } from '../MemcardBuild';

describe('buildTimeline', () => {
  it('gives every block a window, in order', () => {
    const { windows } = buildTimeline(8);
    expect(windows).toHaveLength(8);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].start).toBeGreaterThan(windows[i - 1].start);
      expect(windows[i].end).toBeGreaterThan(windows[i - 1].end);
    }
  });

  // The card is only finished when the last cover lands, so the last
  // window has to end exactly at the end. If it ends early the stamp
  // comes down with scroll left over; if late, it never comes down.
  it('lands the last block exactly at the end of the scroll', () => {
    expect(buildTimeline(8).windows[7].end).toBeCloseTo(1);
    expect(buildTimeline(1).windows[0].end).toBeCloseTo(1);
  });

  it('settles the card before the first cover is in flight', () => {
    const { settleEnd, windows } = buildTimeline(8);
    expect(settleEnd).toBeGreaterThan(0);
    expect(settleEnd).toBeLessThanOrEqual(windows[0].start);
  });

  it('survives a card with no blocks', () => {
    const { windows, settleEnd } = buildTimeline(0);
    expect(windows).toEqual([]);
    expect(Number.isNaN(settleEnd)).toBe(false);
  });

  // The scroll-driven path compresses the whole build into the first
  // `within` of the track, so the finished card gets a hold before the
  // pin releases instead of landing at the exact instant it does.
  describe('with a `within` compression', () => {
    it('lands the last block at `within`, not at the end of the range', () => {
      expect(buildTimeline(8, 0.85).windows[7].end).toBeCloseTo(0.85);
      expect(buildTimeline(8, 0.85).windows[7].end).not.toBeCloseTo(1);
    });

    it('scales settleEnd by the same factor', () => {
      const uncompressed = buildTimeline(8);
      const compressed = buildTimeline(8, 0.85);
      expect(compressed.settleEnd).toBeCloseTo(uncompressed.settleEnd * 0.85);
    });

    it('keeps every window in order after compression', () => {
      const { windows } = buildTimeline(8, 0.85);
      for (let i = 1; i < windows.length; i++) {
        expect(windows[i].start).toBeGreaterThan(windows[i - 1].start);
        expect(windows[i].end).toBeGreaterThan(windows[i - 1].end);
      }
      // And every window still stays inside the compressed range.
      for (const w of windows) {
        expect(w.end).toBeLessThanOrEqual(0.85);
      }
    });

    it('defaults to no compression, still ending at exactly 1', () => {
      expect(buildTimeline(8).windows[7].end).toBeCloseTo(1);
    });
  });
});
