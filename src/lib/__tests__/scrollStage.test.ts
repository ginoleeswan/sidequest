import { stageProgress } from '../scrollStage';

describe('stageProgress', () => {
  // A 3-viewport track on an 800px window: 2400 tall, 1600 of travel.
  const TRACK = 2400;
  const VIEW = 800;

  it('is zero before the track reaches the top of the window', () => {
    expect(stageProgress(500, TRACK, VIEW)).toBe(0);
    expect(stageProgress(0, TRACK, VIEW)).toBe(0);
  });

  it('is one once the track has been scrolled through', () => {
    expect(stageProgress(-1600, TRACK, VIEW)).toBe(1);
    expect(stageProgress(-9999, TRACK, VIEW)).toBe(1);
  });

  it('runs linearly between those two', () => {
    expect(stageProgress(-800, TRACK, VIEW)).toBeCloseTo(0.5);
    expect(stageProgress(-400, TRACK, VIEW)).toBeCloseTo(0.25);
  });

  // The divide-by-zero case: a track no taller than the window has no
  // travel, so there is no meaningful progress to report.
  it('does not divide by zero when the track is not taller than the window', () => {
    expect(stageProgress(10, 800, 800)).toBe(0);
    expect(stageProgress(0, 800, 800)).toBe(1);
    expect(stageProgress(-5, 400, 800)).toBe(1);
    expect(Number.isNaN(stageProgress(0, 0, 800))).toBe(false);
  });
});
