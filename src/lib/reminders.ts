import { Platform } from 'react-native';

import type { IcsEvent } from './ics';

/**
 * A nudge before an evening you already planned.
 *
 * The calendar hand-off is the promise this app actually makes: your
 * plan leaves for the week you already keep. A reminder is the same
 * promise one step further in — the evening arrives and something says
 * so — and it is the one notification this app is allowed, because it
 * is the only one the reader asked for by planning the evening.
 *
 * Local only, and that is not a limitation. A push notification needs a
 * token, a server to hold it and something to decide when to send: three
 * things the app promises never to grow. `scheduleNotificationAsync`
 * with a date fires from the device's own queue, so the reminder works
 * on a plane and nothing about anybody's week leaves the phone.
 *
 * Never scheduled behind the reader's back. These are set as part of the
 * same gesture that files the evenings into the calendar, so the
 * permission sheet arrives while the reader is asking for exactly this.
 */

/** How long before an evening the nudge lands. */
export const REMINDER_LEAD_MINUTES = 30;

const MINUTE = 60_000;

/** Where the notification's identifier comes from, so it stays one per evening. */
export const reminderId = (uid: string) => `sidequest-evening-${uid}`;

/** When a reminder for an evening starting at `start` should fire. */
export function reminderTime(
  start: Date,
  leadMinutes: number = REMINDER_LEAD_MINUTES
): Date {
  return new Date(start.getTime() - leadMinutes * MINUTE);
}

/**
 * The evenings still worth a reminder.
 *
 * An evening whose nudge time has already passed is dropped rather than
 * fired late: a notification that says "starting in 30 minutes" about
 * something that began an hour ago is worse than silence. All-day
 * entries are dropped too — those are the finishes on the memory card,
 * which have no o'clock to be early for.
 */
export function remindable(
  events: readonly IcsEvent[],
  now: Date,
  leadMinutes: number = REMINDER_LEAD_MINUTES
): IcsEvent[] {
  return events.filter(
    (event) =>
      !event.allDay &&
      reminderTime(event.start, leadMinutes).getTime() > now.getTime()
  );
}

/**
 * What the nudge says.
 *
 * The game's name and how long it runs, because those are the two facts
 * that decide whether tonight actually happens — and they are the two
 * this app knows that a calendar alert does not.
 */
export function reminderBody(
  event: IcsEvent,
  leadMinutes: number = REMINDER_LEAD_MINUTES
): string {
  const hours = Math.round(
    (event.end.getTime() - event.start.getTime()) / (60 * MINUTE)
  );
  const span =
    hours >= 1
      ? `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`
      : 'a short one';
  return `${event.title} — ${span}, starting in ${leadMinutes} minutes.`;
}

type NotificationsModule = typeof import('expo-notifications');

/**
 * Android shows nothing at all without a channel, silently.
 *
 * There is no error and no warning: `scheduleNotificationAsync` resolves,
 * the notification is queued, and it never appears. iOS has no such
 * concept and ignores this.
 */
async function ensureChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('evenings', {
    name: 'Planned evenings',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F2A93B',
  });
}

/**
 * Schedule a nudge for each evening, replacing any already set.
 *
 * Returns how many are now queued. Zero is an ordinary answer — the
 * reader may have declined, or every evening in the batch may already
 * have started — and the caller says nothing in that case rather than
 * apologising for a feature nobody asked about.
 */
export async function scheduleEvenings(
  events: readonly IcsEvent[],
  {
    now = new Date(),
    leadMinutes = REMINDER_LEAD_MINUTES,
  }: { now?: Date; leadMinutes?: number } = {}
): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const due = remindable(events, now, leadMinutes);
  if (due.length === 0) return 0;

  const Notifications = await import('expo-notifications');

  // Asked for, not assumed. A decline is a decline: the calendar write
  // that prompted this has already succeeded, so there is nothing to
  // undo and nothing to complain about.
  const settings = await Notifications.getPermissionsAsync();
  const granted =
    settings.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 0;

  await ensureChannel(Notifications);

  let queued = 0;
  for (const event of due) {
    // The identifier is derived from the event's own uid, so filing the
    // same week twice replaces each nudge instead of stacking a second
    // copy of it — the same guarantee the `.ics` uid gives the calendar.
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(event.uid),
      content: {
        title: 'Tonight',
        body: reminderBody(event, leadMinutes),
        // The platform's own sound, not silence. This is a reminder the
        // reader explicitly asked for about an evening they planned;
        // one they cannot hear is a worse version of not setting it.
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime(event.start, leadMinutes),
        channelId: 'evenings',
      },
    });
    queued += 1;
  }
  return queued;
}
