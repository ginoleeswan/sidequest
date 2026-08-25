import { insertEvents } from '../nativeCalendar';
import type { IcsEvent } from '../ics';

const mockRequest = jest.fn();
const mockGetCals = jest.fn();
const mockGetEvents = jest.fn();
const mockCreateEvent = jest.fn();

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: (...a: unknown[]) => mockRequest(...a),
  getCalendarsAsync: (...a: unknown[]) => mockGetCals(...a),
  getEventsAsync: (...a: unknown[]) => mockGetEvents(...a),
  createEventAsync: (...a: unknown[]) => mockCreateEvent(...a),
  EntityTypes: { EVENT: 'event' },
  SourceType: { LOCAL: 'local' },
  CalendarAccessLevel: { OWNER: 'owner' },
}));

const event = (title: string, day: number): IcsEvent => ({
  uid: `${title}-${day}`,
  title,
  start: new Date(2026, 7, day, 20, 0),
  end: new Date(2026, 7, day, 22, 0),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ status: 'granted' });
  mockGetCals.mockResolvedValue([
    { id: 'cal-1', title: 'Sidequest', allowsModifications: true },
  ]);
  mockGetEvents.mockResolvedValue([]);
  mockCreateEvent.mockResolvedValue('event-id');
});

describe('insertEvents', () => {
  it('an empty week is a quiet zero, not a call into the store', async () => {
    // The regression: Math.min of nothing is Infinity, and
    // new Date(Infinity) threw inside the module — a crash dressed as
    // a calendar error, on the success path of an empty plan.
    await expect(insertEvents([])).resolves.toBe(0);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('a declined permission throws the message the toast will show', async () => {
    mockRequest.mockResolvedValue({ status: 'denied' });
    await expect(insertEvents([event('Hades', 28)])).rejects.toThrow(
      /Settings/
    );
  });

  it('writes each event into the Sidequest calendar', async () => {
    await expect(
      insertEvents([event('Hades', 28), event('Celeste', 29)])
    ).resolves.toBe(2);
    expect(mockCreateEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEvent).toHaveBeenCalledWith(
      'cal-1',
      expect.objectContaining({ title: 'Hades' })
    );
  });

  it('skips events already filed, so re-exporting cannot double them', async () => {
    mockGetEvents.mockResolvedValue([
      { title: 'Hades', startDate: new Date(2026, 7, 28, 20, 0) },
    ]);
    await insertEvents([event('Hades', 28), event('Celeste', 29)]);
    expect(mockCreateEvent).toHaveBeenCalledTimes(1);
    expect(mockCreateEvent).toHaveBeenCalledWith(
      'cal-1',
      expect.objectContaining({ title: 'Celeste' })
    );
  });
});
