import {
  HOURS_A_WEEK,
  PILE_HOURS,
  PILE_VERDICT,
  PILE_YEARS,
  inWords,
} from '../pile';

describe('the pile', () => {
  /**
   * The regression this module exists for. The page shipped "900
   * hours", "about six a week" and "fifteen years of evenings" in the
   * same band, and fifteen is five times what those two numbers give.
   */
  it('concludes what its own two numbers conclude', () => {
    expect(PILE_YEARS).toBe(Math.round(PILE_HOURS / HOURS_A_WEEK / 52));
    expect(PILE_YEARS).toBe(3);
  });

  it('states an answer a reader can arrive at themselves', () => {
    const weeks = PILE_HOURS / HOURS_A_WEEK;
    // Within half a year of the honest figure, which is all a rounded
    // verdict promises — and nowhere near the five-fold error above.
    expect(Math.abs(weeks / 52 - PILE_YEARS)).toBeLessThan(0.5);
  });

  it('spells the numbers the sentence uses', () => {
    expect(inWords(3)).toBe('three');
    expect(inWords(6)).toBe('six');
    expect(inWords(0)).toBe('zero');
    expect(inWords(10)).toBe('ten');
  });

  // Past the table rather than throwing: a sentence with a numeral in
  // it is a worse sentence, not a broken page.
  it('falls back to digits above the table', () => {
    expect(inWords(11)).toBe('11');
    expect(inWords(-1)).toBe('-1');
  });

  it('builds the verdict from the numbers, not beside them', () => {
    expect(PILE_VERDICT).toContain(inWords(HOURS_A_WEEK));
    expect(PILE_VERDICT).toContain(inWords(PILE_YEARS));
    expect(PILE_VERDICT).toBe(
      'At six hours a week, that’s three years of evenings.'
    );
  });
});
