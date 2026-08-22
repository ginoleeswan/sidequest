import {
  BEAT_ARRIVE,
  BEAT_EXIT,
  beatAnchor,
  beatIndexAt,
  beatStops,
} from '../beatDeck';

describe('beatStops', () => {
  it('holds the first beat before it starts travelling', () => {
    const stops = beatStops(3);
    expect(stops.input[0]).toBe(0);
    expect(stops.output[0]).toBe(0);
    expect(stops.input[1]).toBeCloseTo(BEAT_ARRIVE);
    expect(stops.output[1]).toBe(0);
  });

  it('holds the last beat until the track ends', () => {
    const stops = beatStops(3);
    const last = stops.input.length - 1;
    expect(stops.input[last]).toBe(1);
    expect(stops.output[last]).toBe(2);
    expect(stops.output[last - 1]).toBe(2);
    expect(1 - stops.input[last - 1]).toBeCloseTo(BEAT_EXIT);
  });

  /**
   * `Animated.interpolate` rejects a range that ever stands still, so
   * this is the property the whole module has to keep — including for
   * beat counts that ask for more hold than the track has.
   */
  it('produces a strictly increasing range at any beat count', () => {
    for (let count = 1; count <= 12; count++) {
      const { input, output } = beatStops(count);
      expect(input.length).toBe(output.length);
      expect(input[0]).toBe(0);
      expect(input[input.length - 1]).toBe(1);
      for (let i = 1; i < input.length; i++) {
        expect(input[i]).toBeGreaterThan(input[i - 1]);
      }
    }
  });

  it('ends on the last beat, never past it', () => {
    for (let count = 1; count <= 6; count++) {
      const { output } = beatStops(count);
      expect(Math.max(...output)).toBe(count - 1);
      expect(Math.min(...output)).toBe(0);
    }
  });
});

describe('beatIndexAt', () => {
  const stops = beatStops(3);

  it('stays on the first beat through the arrival', () => {
    expect(beatIndexAt(0, stops)).toBe(0);
    expect(beatIndexAt(BEAT_ARRIVE / 2, stops)).toBe(0);
    expect(beatIndexAt(BEAT_ARRIVE, stops)).toBe(0);
  });

  it('stays on the last beat through the exit', () => {
    expect(beatIndexAt(1 - BEAT_EXIT / 2, stops)).toBe(2);
    expect(beatIndexAt(1, stops)).toBe(2);
  });

  it('runs half way between two beats at the middle of a transition', () => {
    const start = stops.input[1];
    const end = stops.input[2];
    expect(beatIndexAt((start + end) / 2, stops)).toBeCloseTo(0.5);
  });

  it('holds a whole number across a middle beat', () => {
    expect(beatIndexAt(stops.input[2], stops)).toBe(1);
    expect(beatIndexAt(stops.input[3], stops)).toBe(1);
    expect(beatIndexAt((stops.input[2] + stops.input[3]) / 2, stops)).toBe(1);
  });

  it('clamps outside the track', () => {
    expect(beatIndexAt(-3, stops)).toBe(0);
    expect(beatIndexAt(9, stops)).toBe(2);
  });

  // A single-beat deck has nothing to travel between, and the arrows
  // must not be able to drive it anywhere.
  it('never leaves the only beat of a one-beat deck', () => {
    const one = beatStops(1);
    expect(beatIndexAt(0, one)).toBe(0);
    expect(beatIndexAt(0.5, one)).toBe(0);
    expect(beatIndexAt(1, one)).toBe(0);
  });
});

describe('beatAnchor', () => {
  const stops = beatStops(3);

  it('lands in the middle of a beat s hold, not on its first frame', () => {
    for (const index of [0, 1, 2]) {
      const at = beatAnchor(index, stops);
      expect(beatIndexAt(at, stops)).toBe(index);
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(1);
    }
  });

  it('runs in the same order as the beats', () => {
    expect(beatAnchor(0, stops)).toBeLessThan(beatAnchor(1, stops));
    expect(beatAnchor(1, stops)).toBeLessThan(beatAnchor(2, stops));
  });

  it('answers for a beat that is not there rather than throwing', () => {
    expect(beatAnchor(7, stops)).toBe(0);
  });
});
