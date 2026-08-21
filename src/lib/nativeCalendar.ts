import { Platform } from 'react-native';

import type { IcsEvent } from './ics';

/**
 * The same events the `.ics` export builds, written straight into the
 * device's calendar store.
 *
 * On web the app hands over a file and stays out of the user's accounts;
 * an installed app can do better, because the OS calendar store IS the
 * neutral ground — expo-calendar talks to EventKit and CalendarProvider,
 * not to Google or Apple accounts, so the no-backend promise holds.
 *
 * Events land in a calendar of the app's own. That keeps them one
 * checkbox to hide and one deletion to take back, which is the polite
 * way to be a guest in someone's calendar.
 */

const CALENDAR_TITLE = 'Sidequest';
const CALENDAR_COLOR = '#F2A93B';

type CalendarModule = typeof import('expo-calendar');

async function sidequestCalendarId(Calendar: CalendarModule): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );
  const existing = calendars.find(
    (calendar) =>
      calendar.title === CALENDAR_TITLE && calendar.allowsModifications
  );
  if (existing) return existing.id;

  if (Platform.OS === 'ios') {
    const source = (await Calendar.getDefaultCalendarAsync()).source;
    return Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
    });
  }
  return Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    color: CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: CALENDAR_TITLE,
      type: Calendar.SourceType.LOCAL,
    },
    name: CALENDAR_TITLE,
    ownerAccount: CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Insert events, skipping any already present.
 *
 * The `.ics` path gets this for free from stable UIDs; a device store
 * assigns its own identifiers, so exporting twice would double every
 * event. Matching on title and start time inside our own calendar is
 * enough — nothing else writes there.
 *
 * Returns how many events are now in the calendar from this batch,
 * counting the ones that were already there.
 */
export async function insertEvents(events: IcsEvent[]): Promise<number> {
  const Calendar = await import('expo-calendar');
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(
      'Calendar access was declined — you can allow it in Settings'
    );
  }

  const calendarId = await sidequestCalendarId(Calendar);

  const from = new Date(Math.min(...events.map((e) => e.start.getTime())));
  const to = new Date(Math.max(...events.map((e) => e.end.getTime())));
  const already = await Calendar.getEventsAsync([calendarId], from, to);
  const seen = new Set(
    already.map(
      (event) => `${event.title}|${new Date(event.startDate).toDateString()}`
    )
  );

  for (const event of events) {
    if (seen.has(`${event.title}|${event.start.toDateString()}`)) continue;
    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      notes: event.description,
      startDate: event.start,
      endDate: event.end,
      allDay: event.allDay ?? false,
    });
  }
  return events.length;
}
