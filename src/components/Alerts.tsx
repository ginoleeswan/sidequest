import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LetGoBar } from './LetGoBar';
import { useToast } from './Toast';
import type { Alert } from '@/lib/alerts';
import { recordDrop, type DropReason } from '@/lib/drops';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const ICON: Record<Alert['kind'], keyof typeof Ionicons.glyphMap> = {
  'at-risk': 'alert-circle',
  'due-soon': 'calendar',
  'nearly-done': 'flag',
};

/**
 * What the app would have sent you, if it could send you anything.
 *
 * Real notifications need a server to push from and an app on a
 * homescreen to receive them; neither exists yet, and asking for
 * notification permission that leads nowhere is worse than staying
 * quiet. So these are worked out when the plan opens.
 *
 * Every one of them carries the way out with it. The point of the
 * product is permission to drop things, and an alert that only says "you
 * are behind" is the opposite of that.
 */
export function Alerts({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const { setDeadline, setStatus, removeMany, entries } = useLibrary();
  const toast = useToast();

  /**
   * The game somebody has just said they might let go of.
   *
   * Held rather than acted on, because letting go is asked about
   * before it is done — the reason is the only thing the shelves ever
   * learn from a drop, and a one-tap delete would throw it away.
   */
  const [letting, setLetting] = useState<Alert | null>(null);

  const letGo = (reason?: DropReason) => {
    if (!letting) return;
    const count = removeMany([letting.gameId]);
    if (reason && count > 0) recordDrop(reason);
    setLetting(null);
    if (count > 0) toast('Let go. Nothing owed.', 'checkmark-circle');
  };

  if (alerts.length === 0) return null;

  return (
    <View style={styles.list}>
      {alerts.map((alert) => (
        <View
          key={`${alert.kind}-${alert.gameId}`}
          style={[styles.card, alert.kind === 'at-risk' && styles.cardWarn]}
        >
          <View style={styles.head}>
            {/* The icon sits on the first line's optical centre, not at
                the top of the text block. Flush to the block's top it
                floated in the leading above the cap line — measured 12
                points high, and unmistakable once the message wrapped
                to two lines. The box is one line tall and centres its
                own contents, so it stays right if the type scale
                changes. */}
            <View style={styles.headIcon}>
              <Ionicons
                name={ICON[alert.kind]}
                size={ICON_SIZE}
                color={
                  alert.kind === 'at-risk' ? COLORS.accent : COLORS.mediumGrey
                }
              />
            </View>
            <Text style={styles.message}>{alert.message}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/game/${alert.gameId}`)}
              accessibilityRole="link"
            >
              <Text style={styles.action}>Open</Text>
            </Pressable>

            {alert.kind === 'at-risk' && (
              <Pressable
                onPress={() => {
                  setDeadline(alert.gameId, null);
                  toast('Date cleared. Nothing owed.', 'checkmark-circle');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Clear the date on ${alert.name}`}
              >
                <Text style={styles.action}>Drop the date</Text>
              </Pressable>
            )}

            {alert.kind === 'at-risk' && (
              /*
               * The one the product is named after.
               *
               * PRODUCT.md §6.4 calls "you can't finish this, drop it?"
               * the honest notification, and this card is where the app
               * finally says it. Offering the sentence without the
               * button was the version that read as nagging: told you
               * it was hopeless, then left you to find the exit.
               */
              <Pressable
                onPress={() => setLetting(alert)}
                accessibilityRole="button"
                accessibilityLabel={`Let ${alert.name} go`}
              >
                <Text style={[styles.action, styles.actionLetGo]}>
                  Let it go
                </Text>
              </Pressable>
            )}

            {alert.kind === 'nearly-done' && (
              <Pressable
                onPress={() => {
                  // Toast only what happened: the entry can be gone by
                  // the time this is tapped (removed since the alert
                  // list was computed), and celebrating a no-op tells
                  // the user their tap worked when it did not.
                  const entry = entries[String(alert.gameId)];
                  if (!entry) return;
                  setStatus(entry.game, 'finished');
                  toast('Credits rolled', 'checkmark-circle');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${alert.name} finished`}
              >
                <Text style={styles.action}>Already finished it</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {letting && <LetGoBar count={1} onLetGo={letGo} />}
    </View>
  );
}

/** One size for the leading icon, shared by the icon and the indent. */
const ICON_SIZE = 14;

const styles = StyleSheet.create({
  list: { gap: SPACING.sm },
  card: {
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.raised,
  },
  cardWarn: { borderColor: 'rgba(245,165,36,0.45)' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  headIcon: {
    width: ICON_SIZE,
    height: TYPE.p.lineHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...TYPE.p,
    color: COLORS.lightGrey,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    // A hanging indent, derived rather than guessed: the actions line
    // up under the message, so the offset is exactly the icon and the
    // gap beside it. It was a hand-picked 22, which happened to be
    // right until either of those two numbers moved.
    paddingLeft: ICON_SIZE + SPACING.sm,
  },
  action: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
  /**
   * Letting go is coral everywhere else in this app — the drops, the
   * amnesty, the LET GO figure on You — so it is coral here. It also
   * separates the two escapes on this card at a glance: the amber one
   * keeps the game, the coral one does not.
   */
  actionLetGo: { color: COLORS.coral },
});
