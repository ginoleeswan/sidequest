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
export function SessionTimer({
  game,
  block = false,
}: {
  game: Game;
  /**
   * A button on its own line, for the rail.
   *
   * Inline, this is an icon and a label sharing a wrapping row with the
   * commitment toggles — which was right inside the phone's decision
   * card, where a frame held the group together. In a 400pt rail with
   * that card gone it is the page's primary action rendered as grey
   * text next to two other grey texts, and it reads as a leftover.
   */
  block?: boolean;
}) {
  const hydrated = useHydrated();
  const { addPlayTime, entries, setStatus } = useLibrary();
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
        // The label says "stops X", so stopping must mean what it means
        // everywhere else: the other game's time is logged and credited,
        // not thrown away. startSession alone would overwrite the
        // running record — ninety unlogged minutes gone on one tap.
        if (running) {
          const logged = endSession();
          if (logged) {
            const other = entries[String(logged.gameId)];
            if (other) addPlayTime(other.game, logged.minutes / 60);
            toast(
              `Logged ${formatMinutes(logged.minutes)} on ${running.name}`,
              'checkmark-circle'
            );
          }
        }
        setRunning(startSession(game.id, game.name));
        setNow(Date.now());
      }}
      style={block ? styles.startBlock : styles.start}
      accessibilityRole="button"
      accessibilityLabel={`Start a session on ${game.name}`}
    >
      <Ionicons
        name="play"
        size={block ? 15 : 14}
        color={block ? COLORS.white : COLORS.lightGrey}
      />
      <Text style={[styles.startText, block && styles.startBlockText]}>
        {running
          ? `Start a session (stops ${running.name})`
          : 'Start a session'}
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
    backgroundColor: COLORS.raised,
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
  /**
   * A quiet action inside the decision panel, not a lozenge beside it.
   *
   * This was a solid white "Start playing" under three status chips —
   * one of which also says Playing — so the quieter concern shouted and
   * two controls used one word for different things. Demoting it to an
   * outline only moved the problem: an outlined pill floating under a
   * filled segmented control has nothing holding it. Icon and label,
   * inside the same frame as the decision it follows.
   */
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: SPACING.xs,
  },
  startText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  /**
   * The same action, given a surface and a line of its own.
   *
   * Not the white lozenge it used to be: white would shout over the
   * amber selection in the control above it, and the status group
   * already owns the loudest ink in that column. A raised plate with
   * the app's own stroke is a button without a contest — and spanning
   * the rail it reads as what follows from the decision rather than as
   * something dropped beside it.
   */
  startBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
    // The status control's radius, its stroke and its ground — all
    // three, not just the radius. On COLORS.raised this was a light
    // plate under a dark one: two adjacent controls on two different
    // surfaces, which is what made the shelf cluster read as clutter
    // however the spacing moved. One family now — the group's plate,
    // the group's stroke — and the amber selection above stays the
    // only louder thing in the column.
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    backgroundColor: COLORS.plate,
  },
  startBlockText: { ...TYPE.label, color: COLORS.white },
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
