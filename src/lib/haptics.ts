import { Platform } from 'react-native';

/**
 * Touch feedback, as a courtesy rather than a dependency.
 *
 * Web has no haptics and jest has no native module, so every call is
 * fire-and-forget behind a platform gate: nothing awaits it, nothing
 * fails because of it. The module loads lazily so the web bundle never
 * carries it at all.
 */

/** A light tick under a deliberate tap — a tab, a chip, a toggle. */
export function tickle(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) => haptics.selectionAsync())
    .catch(() => {});
}

/** The firm double-tap of something completed. */
export function celebrate(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) =>
      haptics.notificationAsync(haptics.NotificationFeedbackType.Success)
    )
    .catch(() => {});
}
