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

/**
 * The small bump of something landing: a save, a cap bottoming out, a
 * duration committed. Lighter than `celebrate` because it happens often.
 */
export function impact(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light))
    .catch(() => {});
}

/**
 * The one feedback that asks for attention: an act that removes
 * something. Letting a game go is allowed to be felt.
 */
export function warn(): void {
  if (Platform.OS === 'web') return;
  import('expo-haptics')
    .then((haptics) =>
      haptics.notificationAsync(haptics.NotificationFeedbackType.Warning)
    )
    .catch(() => {});
}

export type Haptic = 'tap' | 'impact' | 'celebrate' | 'warn';

/** Fire a haptic by name, for primitives that take one as a prop. */
export function haptic(kind: Haptic | undefined): void {
  if (kind === 'tap') tap();
  else if (kind === 'impact') impact();
  else if (kind === 'celebrate') celebrate();
  else if (kind === 'warn') warn();
}
