import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHydrated } from '@/hooks/useHydrated';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * An invitation to install, offered once.
 *
 * The service worker and the manifest have been there for weeks and
 * nothing ever suggested using them. Chrome hands over a prompt event;
 * iOS Safari does not, and the only way onto a home screen there is the
 * share sheet, so that platform gets a sentence instead of a button —
 * which is more honest than a button that cannot work.
 *
 * Dismissed is dismissed: the answer is remembered, and this is not the
 * kind of app that asks twice.
 */

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

export function InstallPrompt() {
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = usePersistedState(
    'sidequest.install.dismissed.v1',
    false
  );
  const [event, setEvent] = useState<InstallEvent | null>(null);
  /**
   * Read once, at mount, rather than in an effect: which browser this is
   * cannot change while the page is open, and setting state from an
   * effect to record it is a second render for no reason.
   */
  const [ios] = useState(
    () => Platform.OS === 'web' && !isStandalone() && isIosSafari()
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || isStandalone()) return;

    const onPrompt = (raw: Event) => {
      // Keep it: fired once, and needed later when the person says yes.
      raw.preventDefault();
      setEvent(raw as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!hydrated || dismissed || Platform.OS !== 'web') return null;
  if (!event && !ios) return null;

  return (
    <View style={styles.card}>
      <Ionicons name="phone-portrait" size={16} color={COLORS.accent} />
      <Text style={styles.text}>
        {ios
          ? 'Add Sidequest to your home screen: Share, then Add to Home Screen. It works offline.'
          : 'Install Sidequest — it opens like an app and works offline.'}
      </Text>
      {event && (
        <Pressable
          onPress={async () => {
            await event.prompt();
            const { outcome } = await event.userChoice;
            setEvent(null);
            if (outcome === 'accepted') setDismissed(true);
          }}
          style={styles.install}
          accessibilityRole="button"
        >
          <Text style={styles.installText}>Install</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Not now"
      >
        <Ionicons name="close" size={15} color={COLORS.mediumGrey} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.raised,
  },
  text: {
    ...TYPE.caption,
    color: COLORS.lightGrey,
    flex: 1,
  },
  install: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  installText: {
    ...TYPE.labelTiny,
    color: COLORS.darkGrey,
  },
});
