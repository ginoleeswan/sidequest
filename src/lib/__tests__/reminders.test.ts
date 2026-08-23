import type { IcsEvent } from '../ics';
import {
  REMINDER_LEAD_MINUTES,
  reminderBody,
  reminderId,
  reminderTime,
  remindable,
} from '../reminders';

const at = (
  hour: number,
  hours = 2,
  over: Partial<IcsEvent> = {}
): IcsEvent => ({
  uid: `e-${hour}`,
  start: new Date(2026, 7, 20, hour),
  end: new Date(2026, 7, 20, hour + hours),
  title: 'Hades',
  ...over,
});

describe('reminderTime', () => {
  it('lands the lead time before the evening starts', () => {
    const start = new Date(2026, 7, 20, 20);
    expect(reminderTime(start, 30).getTime()).toBe(
      start.getTime() - 30 * 60000
    );
  });

  it('defaults to the shared lead', () => {
    const start = new Date(2026, 7, 20, 20);
    expect(reminderTime(start).getTime()).toBe(
      start.getTime() - REMINDER_LEAD_MINUTES * 60000
    );
  });

  // Crossing midnight backwards is the case a naive hour subtraction
  // gets wrong, and an 00:15 evening is a real one.
  it('crosses midnight backwards', () => {
    const start = new Date(2026, 7, 21, 0, 15);
    const fires = reminderTime(start, 30);
    expect(fires.getDate()).toBe(20);
    expect(fires.getHours()).toBe(23);
    expect(fires.getMinutes()).toBe(45);
  });
});

describe('remindable', () => {
  const now = new Date(2026, 7, 20, 18);

  it('keeps evenings whose nudge is still ahead', () => {
    expect(remindable([at(20)], now).map((e) => e.uid)).toEqual(['e-20']);
  });

  /**
   * The point of the filter. A nudge that says "starting in 30 minutes"
   * about something that began an hour ago is worse than silence.
   */
  it('drops evenings that have already started', () => {
    expect(remindable([at(17)], now)).toEqual([]);
  });

  it('drops an evening whose nudge time has just passed', () => {
    // Starts at 18:20, so the 30-minute nudge was due at 17:50.
    const soon: IcsEvent = {
      ...at(18),
      start: new Date(2026, 7, 20, 18, 20),
      end: new Date(2026, 7, 20, 20),
    };
    expect(remindable([soon], now)).toEqual([]);
  });

  // The memory card's finishes are all-day entries: no o'clock, so
  // nothing to be early for.
  it('ignores all-day entries', () => {
    expect(remindable([at(21, 2, { allDay: true })], now)).toEqual([]);
  });

  it('leaves an empty week alone', () => {
    expect(remindable([], now)).toEqual([]);
  });
});

describe('reminderBody', () => {
  it('names the game and how long it runs', () => {
    expect(reminderBody(at(20, 2), 30)).toBe(
      'Hades — about 2 hours, starting in 30 minutes.'
    );
  });

  it('says hour, not hours, for one', () => {
    expect(reminderBody(at(20, 1), 30)).toContain('about 1 hour,');
  });

  it('does not claim "about 0 hours" for a short evening', () => {
    const brief: IcsEvent = {
      ...at(20),
      end: new Date(2026, 7, 20, 20, 20),
    };
    expect(reminderBody(brief, 30)).toContain('a short one');
  });
});

describe('reminderId', () => {
  // Scheduling the same week twice must replace each nudge rather than
  // stack a second copy — the identifier is what guarantees that.
  it('is stable for an event and unique between events', () => {
    expect(reminderId('abc')).toBe(reminderId('abc'));
    expect(reminderId('abc')).not.toBe(reminderId('abd'));
  });
});
