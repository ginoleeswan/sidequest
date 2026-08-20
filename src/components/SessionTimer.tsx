import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { useLibrary } from '@/lib/library';
import {
  cancelSession,
  elapsedMinutes,
  endSession,
  formatMinutes,
  readRunning,
  startSession,
  type RunningSession,
} from '@/lib/sessions';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** The clock only has to look right, so a minute is plenty. */
const TICK_MS = 15_000;

/**
 * Press play, and the app counts.
 *
 * Until now progress existed only for people who play on Steam:
 * everyone else got a flat guess that a game under way is half done.
 * This is the honest alternative, and it costs one tap — then it asks
 * the only question that matters afterwards, which is whether the
 * credits rolled.
 */
export function SessionTimer({ game }: { game: Game }) {
  const hydrated = useHydrated();
  const { addPlayTime, setStatus } = useLibrary();
  const toast = useToast();

  const [running, setRunning] = useState<RunningSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [justPlayed, setJustPlayed] = useState<number | null>(null);

  // Storage is only readable after hydration, and the pre-rendered HTML
  // was built without a session in progress.
  const [adopted, setAdopted] = useState(false);
  if (hydrated && !adopted) {
    setAdopted(true);
    setRunning(readRunning());
  }

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  if (!hydrated) return null;

  // A session for another game is that game's business.
  const mine = running?.gameId === game.id ? running : null;

  if (justPlayed != null) {
    return (
      <View style={styles.card}>
        <Text style={styles.done}>
          {formatMinutes(justPlayed)} on {game.name}. Did you see the credits?
        </Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              setStatus(game, 'finished');
              setJustPlayed(null);
              toast('Credits rolled', 'checkmark-circle');
            }}
            style={styles.primary}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Yes — finished it</Text>
          </Pressable>
          <Pressable
            onPress={() => setJustPlayed(null)}
            style={styles.ghost}
            accessibilityRole="button"
          >
            <Text style={styles.ghostText}>Not yet</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (mine) {
    const minutes = elapsedMinutes(mine, now);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.live} />
          <Text style={styles.clock}>Playing · {formatMinutes(minutes)}</Text>
        </View>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              const logged = endSession();
              setRunning(null);
              if (!logged) return;
              addPlayTime(game, logged.minutes / 60);
              setJustPlayed(logged.minutes);
            }}
            style={styles.primary}
            accessibilityRole="button"
            accessibilityLabel="Stop playing and record the time"
          >
            <Ionicons name="stop" size={14} color={COLORS.darkGrey} />
            <Text style={styles.primaryText}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              cancelSession();
              setRunning(null);
              toast('Session discarded', 'close-circle');
            }}
            style={styles.ghost}
            accessibilityRole="button"
            accessibilityLabel="Throw this session away"
          >
            <Text style={styles.ghostText}>Discard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        setRunning(startSession(game.id, game.name));
        setNow(Date.now());
      }}
      style={styles.start}
      accessibilityRole="button"
      accessibilityLabel={`Start playing ${game.name}`}
    >
      <Ionicons name="play" size={14} color={COLORS.darkGrey} />
      <Text style={styles.primaryText}>
        {running ? `Start playing (stops ${running.name})` : 'Start playing'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  live: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  clock: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  done: {
    ...TYPE.body,
    color: COLORS.lightGrey,
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  primaryText: {
    ...TYPE.labelSmall,
    color: COLORS.darkGrey,
  },
  ghost: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  ghostText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
});
