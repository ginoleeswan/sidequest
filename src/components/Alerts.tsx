import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from './Toast';
import type { Alert } from '@/lib/alerts';
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
  const { setDeadline, setStatus, entries } = useLibrary();
  const toast = useToast();

  if (alerts.length === 0) return null;

  return (
    <View style={styles.list}>
      {alerts.map((alert) => (
        <View
          key={`${alert.kind}-${alert.gameId}`}
          style={[styles.card, alert.kind === 'at-risk' && styles.cardWarn]}
        >
          <View style={styles.head}>
            <Ionicons
              name={ICON[alert.kind]}
              size={14}
              color={
                alert.kind === 'at-risk' ? COLORS.accent : COLORS.mediumGrey
              }
            />
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

            {alert.kind === 'nearly-done' && (
              <Pressable
                onPress={() => {
                  const entry = entries[String(alert.gameId)];
                  if (entry) setStatus(entry.game, 'finished');
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
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: SPACING.sm },
  card: {
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardWarn: { borderColor: 'rgba(245,165,36,0.45)' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  message: {
    ...TYPE.p,
    color: COLORS.lightGrey,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingLeft: SPACING.lg + 2,
  },
  action: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
});
