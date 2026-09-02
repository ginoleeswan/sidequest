import { Platform } from 'react-native';

/**
 * Touch feedback, as a courtesy rather than a dependency.
 *
 * Web has no haptics and jest has no native module, so every call is
 * fire-and-forget behind a platform gate: nothing awaits it, nothing
 * fails because of it. The module loads lazily so the web bundle never
 * carries it at all.
 */

/** The firm double-tap of something completed. */
export function celebrate(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) =>
      haptics.notificationAsync(haptics.NotificationFeedbackType.Success)
    )
    .catch(() => {});
}

/** The light click of a selection changing. */
export function tap(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) => haptics.selectionAsync())
    .catch(() => {});
}
