import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { PrimaryButton } from './PrimaryButton';
import { Touchable } from './Touchable';
import { YearBlocks } from './YearBlocks';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useCountUp } from '@/hooks/useCountUp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { celebrate } from '@/lib/haptics';
import { useLibrary } from '@/lib/library';
import { libraryStats } from '@/lib/libraryStats';
import { blocksByMonth, buildMemcard } from '@/lib/memcard';
import { COLORS, alpha } from '@/styles/colors';
import { SPRING } from '@/styles/motion';
import { RADIUS, SPACING, TOUCH } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
  // Read once: a date taken during render moves under the animation.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!game) {
      rise.setValue(0);
      return;
    }
    // The moment lands in the hand as well as on screen.
    celebrate();
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

  const library = Object.values(entries);
  const stats = libraryStats(library, (g) => durationOf(g).hours);
  const duration = game ? durationOf(game) : null;
  const left = stats.waiting + stats.playing;

  /**
   * The year this finish just landed in.
   *
   * The month comes from the card rather than from the clock, so a game
   * finished with a back-dated `finishedAt` lands where it belongs — and
   * so nothing is marked at all if, for any reason, the finish did not
   * make it into the year.
   */
  const card = buildMemcard(
    library,
    (g) => durationOf(g).hours,
    new Date(now).getFullYear()
  );
  const months = blocksByMonth(card);
  const newest = game
    ? card.blocks.find((block) => block.id === game.id)
    : undefined;

  // The two numbers this screen exists to move. Counted from where they
  // stood a moment ago, which is this game's worth of hours ago.
  const finished = useCountUp(
    stats.finished,
    Math.max(stats.finished - 1, 0),
    game != null
  );
  const rolled = useCountUp(
    stats.hoursFinished,
    Math.max(
      stats.hoursFinished - (duration?.rough ? 0 : (duration?.hours ?? 0)),
      0
    ),
    game != null
  );

  if (!game || !duration) return null;

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

            {/* The finish, staged the way the landing page stages its
                evidence: the game's own art at full width, the name over
                it, and FINISHED thumped across in mint — the colour this
                app gives to finishing things. A cover in a row with a
                heading above it is a list item; this is a moment. */}
            <View style={styles.stage}>
              <CoverImage
                uri={game.background_image}
                style={styles.stageArt}
                size="tile"
              />
              <LinearGradient
                colors={[
                  alpha(COLORS.ink, 0),
                  alpha(COLORS.ink, 0.5),
                  alpha(COLORS.ink, 0.92),
                ]}
                locations={[0, 0.5, 1]}
                style={styles.stageVeil}
                pointerEvents="none"
              />
              <View style={styles.stageBody}>
                <Text style={styles.eyebrow}>CREDITS ROLLED</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {game.name}
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.stamp,
                  {
                    opacity: rise.interpolate({
                      inputRange: [0, 0.35, 1],
                      outputRange: [0, 1, 1],
                    }),
                    transform: [
                      { rotate: '-7deg' },
                      {
                        scale: rise.interpolate({
                          inputRange: [0, 1],
                          outputRange: [2.3, 1],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <Text
                  style={styles.stampWord}
                  maxFontSizeMultiplier={FONT_SCALE.display}
                >
                  FINISHED
                </Text>
              </Animated.View>
            </View>

            {/* The block this just earned, landing on the year it lands
                in. The card is the only object the app owns, and until
                now it was nowhere near the moment that creates one. */}
            <View style={styles.year}>
              <YearBlocks months={months} landed={newest?.month ?? null} />
            </View>

            <Text style={styles.line}>
              {/* Only quote a number we stand behind. An estimate the app
                  has already flagged as shaky has no business being the
                  headline of someone's achievement. */}
              {duration.hours > 0 && !duration.rough
                ? `That’s ${formatHours(duration.hours)} of your backlog, done.`
                : 'One more off the pile.'}
            </Text>

            {/* Mint, like the stamp above them: these are the counts of
                things finished, and this screen is the one place in
                the app that is entirely about finishing. They were
                amber, which is time still to spend. */}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{Math.round(finished)}</Text>
                <Text style={styles.statLabel}>finished</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatHours(rolled)}</Text>
                <Text style={styles.statLabel}>credits rolled</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValueQuiet}>{left}</Text>
                <Text style={styles.statLabel}>still waiting</Text>
              </View>
            </View>

            {/* The app's one primary, not a white pill of its own: the
                way on from here is the same kind of act as every other
                amber button, and should look like one. */}
            <PrimaryButton
              label="What’s next"
              icon="arrow-forward"
              haptic="tap"
              block
              onPress={() => {
                onClose();
                router.push('/plan');
              }}
            />
            <Touchable onPress={onClose} style={styles.ghost}>
              <Text style={styles.ghostText}>Keep browsing</Text>
            </Touchable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: alpha(COLORS.ink, 0.86),
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
  stage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    marginBottom: SPACING.lg,
  },
  stageArt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stageVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
  },
  stageBody: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.md,
    gap: 2,
  },
  stamp: {
    position: 'absolute',
    top: '26%',
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: COLORS.mint,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    backgroundColor: alpha(COLORS.ink, 0.55),
  },
  /** The title step, tracked wide the way a rubber stamp is cut. */
  stampWord: {
    ...TYPE.title,
    letterSpacing: 4,
    color: COLORS.mint,
  },
  eyebrow: {
    ...TYPE.tag,
    // Finishing's colour. Amber is time; this screen is about the
    // opposite of time — a thing that is done.
    color: COLORS.mint,
  },
  title: {
    ...TYPE.title,
    color: COLORS.white,
    textAlign: 'center',
  },
  year: { marginBottom: SPACING.lg, alignItems: 'center' },
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
    color: COLORS.mint,
  },
  statValueQuiet: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
  },
  statLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  ghost: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH.min,
  },
  ghostText: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
});
