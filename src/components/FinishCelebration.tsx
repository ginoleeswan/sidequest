import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CoverImage } from './CoverImage';
import { Mark } from './Mark';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { libraryStats } from '@/lib/libraryStats';
import { COLORS } from '@/styles/colors';
import { SPRING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The moment a game is finished.
 *
 * Everything else in Sidequest counts what is left. This is the one screen
 * that counts what is done — and finishing a game is the only thing the
 * whole product is actually for. A counter quietly incrementing was not a
 * payoff; this says the words, shows the hours, and tells you what it
 * changed about the rest of the backlog.
 *
 * Deliberately not confetti: the app's voice is permission, not applause.
 */
export function FinishCelebration({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { entries } = useLibrary();
  const { durationOf } = useDurations();
  const rise = useAnimatedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!game) {
      rise.setValue(0);
      return;
    }
    if (reduced) {
      // The moment still lands; it just doesn't travel to get here.
      rise.setValue(1);
      return;
    }
    const animation = Animated.spring(rise, {
      toValue: 1,
      ...SPRING.surface,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [game, rise, reduced]);

  if (!game) return null;

  const stats = libraryStats(
    Object.values(entries),
    (g) => durationOf(g).hours
  );
  const duration = durationOf(game);
  const left = stats.waiting + stats.playing;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: rise,
              transform: [
                {
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.crest}>
              <Mark size={30} />
            </View>

            <Text style={styles.eyebrow}>CREDITS ROLLED</Text>
            <Text style={styles.title} numberOfLines={3}>
              {game.name}
            </Text>

            <View style={styles.artRow}>
              <CoverImage
                uri={game.background_image}
                style={styles.art}
                size="tile"
              />
            </View>

            <Text style={styles.line}>
              {/* Only quote a number we stand behind. An estimate the app
                  has already flagged as shaky has no business being the
                  headline of someone's achievement. */}
              {duration.hours > 0 && !duration.rough
                ? `That’s ${formatHours(duration.hours)} of your backlog, done.`
                : 'One more off the pile.'}
            </Text>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{stats.finished}</Text>
                <Text style={styles.statLabel}>finished</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {formatHours(stats.hoursFinished)}
                </Text>
                <Text style={styles.statLabel}>credits rolled</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValueQuiet}>{left}</Text>
                <Text style={styles.statLabel}>still waiting</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                onClose();
                router.push('/plan');
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>What’s next</Text>
              <Ionicons
                name="arrow-forward"
                size={15}
                color={COLORS.darkGrey}
              />
            </Pressable>
            <Pressable onPress={onClose} style={styles.ghost}>
              <Text style={styles.ghostText}>Keep browsing</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,17,25,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  crest: {
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.accent,
    textAlign: 'center',
  },
  title: {
    ...TYPE.title,
    color: COLORS.white,
    textAlign: 'center',
  },
  artRow: { alignItems: 'center', marginVertical: SPACING.sm },
  art: {
    width: '100%',
    height: 128,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  line: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  statValue: {
    ...TYPE.h2,
    color: COLORS.accent,
  },
  statValueQuiet: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
  },
  statLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  primaryText: {
    ...TYPE.h4,
    color: COLORS.darkGrey,
  },
  ghost: { alignItems: 'center', paddingVertical: SPACING.sm },
  ghostText: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
});
