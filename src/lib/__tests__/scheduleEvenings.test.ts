import { Platform } from 'react-native';

import { scheduleEvenings, reminderId } from '../reminders';
import type { IcsEvent } from '../ics';

/**
 * The pure half of reminders has its own suite; this one covers the
 * scheduling half, whose riskiest behaviour the source itself names:
 * on Android, without the channel, scheduleNotificationAsync resolves
 * and the notification never appears — no error, no warning, and the
 * UI reports success. The ordering IS the feature.
 */

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockSetChannel = jest.fn();
const mockSchedule = jest.fn();
const calls: string[] = [];

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...a: unknown[]) => mockGetPermissions(...a),
  requestPermissionsAsync: (...a: unknown[]) => mockRequestPermissions(...a),
  setNotificationChannelAsync: (...a: unknown[]) => {
    calls.push('channel');
    return mockSetChannel(...a);
  },
  scheduleNotificationAsync: (...a: unknown[]) => {
    calls.push('schedule');
    return mockSchedule(...a);
  },
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const tonight = (): IcsEvent => {
  const start = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return {
    uid: 'evening-1',
    title: 'Hades',
    start,
    end: new Date(start.getTime() + 2 * 60 * 60 * 1000),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  mockGetPermissions.mockResolvedValue({ granted: true });
  mockSetChannel.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('id');
});

describe('scheduleEvenings', () => {
  it('creates the Android channel before the first schedule', async () => {
    // The channel is Android's concept; jest's default platform is ios.
    const was = Platform.OS;
    (Platform as { OS: string }).OS = 'android';
    try {
      const queued = await scheduleEvenings([tonight()]);
      expect(queued).toBe(1);
      expect(calls.indexOf('channel')).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf('channel')).toBeLessThan(calls.indexOf('schedule'));
    } finally {
      (Platform as { OS: string }).OS = was;
    }
  });

  it('iOS skips the channel and still schedules', async () => {
    const queued = await scheduleEvenings([tonight()]);
    expect(queued).toBe(1);
    expect(calls).not.toContain('channel');
  });

  it('derives the identifier from the event uid, so refiling replaces', async () => {
    await scheduleEvenings([tonight()]);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: reminderId('evening-1') })
    );
  });

  it('a decline is a quiet zero, never a throw', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false });
    mockRequestPermissions.mockResolvedValue({ granted: false });
    await expect(scheduleEvenings([tonight()])).resolves.toBe(0);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does nothing at all on web', async () => {
    const was = Platform.OS;
    (Platform as { OS: string }).OS = 'web';
    try {
      await expect(scheduleEvenings([tonight()])).resolves.toBe(0);
      expect(mockGetPermissions).not.toHaveBeenCalled();
    } finally {
      (Platform as { OS: string }).OS = was;
    }
  });
});
