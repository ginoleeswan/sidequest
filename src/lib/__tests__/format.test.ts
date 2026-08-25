import { calendarDate, compact } from '../format';

describe('compact', () => {
  it('leaves small numbers alone and shortens big ones', () => {
    expect(compact(931)).toBe('931');
    expect(compact(12_926)).toBe('12.9k');
    expect(compact(1_200_000)).toBe('1.2m');
  });
});

describe('calendarDate', () => {
  /**
   * The regression this guards: parsed as UTC midnight and formatted in
   * local time, "2013-09-17" read as September 16 everywhere west of
   * Greenwich. jest runs in UTC by default, so the stronger assertion
   * is the frame: the formatter must name the same day the string does,
   * whatever the host timezone.
   */
  it('names the day the string names', () => {
    expect(calendarDate('2013-09-17')).toBe('September 17, 2013');
  });

  it('has a short form for shelf corners', () => {
    expect(calendarDate('2026-01-02', 'short')).toBe('Jan 2');
  });
});
