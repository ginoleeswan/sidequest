import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { Rise } from './Rise';
import { Words } from './Words';
import { queryKeys } from '@/api/queryClient';
import { getMustPlayGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { planSchedule, type PlanItem } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import type { LandingScale } from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The product, on the page, working.
 *
 * Everything else here is an argument about what the app does, and an
 * argument is the weakest form this could take. The whole pitch is one
 * question — how much do you actually play — and one answer, and both
 * fit in a band. So a stranger gets to ask it before deciding whether to
 * open anything: four taps, real games, real lengths, and the app's own
 * scheduler doing the arithmetic.
 *
 * `planSchedule` is imported rather than reimplemented, which is the
 * point. A landing page that fakes its own demonstration is lying
 * slowly; this one cannot disagree with the product because it *is* the
 * product, and if the engine ever changes its mind about what fits, the
 * page changes with it.
 *
 * Chips rather than a slider. A slider looks livelier in a screenshot
 * and is worse to use: it needs a drag on a page that scrolls
 * vertically, it has no readable resting state, and the honest answer
 * space here is four options wide. Four numbers are one tap each and
 * say plainly what is being asked.
 */
/**
 * The four honest answers, each named after a life rather than a number.
 *
 * "2h" was the headline and the life was the caption, which asks the
 * reader to translate their week into hours before they can answer —
 * the one piece of arithmetic this product promises to do for them.
 * Flipped, the chip asks a question anyone can answer on sight: which
 * of these is your week? A parent recognises "after bedtime" faster
 * than any number, a student "school nights", a nine-to-fiver "after
 * work". The hours stay, small, because the scheduler runs on them and
 * hiding the number would make the answer feel like a guess.
 */
const PACES: {
  hours: number;
  life: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { hours: 2, life: 'After bedtime', icon: 'moon' },
  { hours: 5, life: 'School nights', icon: 'school' },
  { hours: 10, life: 'After work', icon: 'briefcase' },
  { hours: 20, life: 'Free weekends', icon: 'sunny' },
];

/**
 * How far out to plan.
 *
 * Twelve weeks, arrived at by watching the thing actually answer. At
 * twenty-six the horizon was so generous that every pace fitted almost
 * everything — measured live, the band read "3 of these 3" whichever
 * number was tapped, which is a demonstration that demonstrates
 * nothing. Three months is short enough that the pace decides the
 * answer and long enough that two hours a week still finishes
 * something.
 */
const HORIZON_WEEKS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Enough to make a shelf, few enough to read at a glance. */
const COUNT = 8;

export function LandingTry({ scale }: { scale: LandingScale }) {
  const [pace, setPace] = useState(5);
  /**
   * Its own games, not the wall's.
   *
   * The wall is fed Trending, which on RAWG means recently added —
   * mostly unreleased, and an unreleased game has no reported length.
   * Filtering those out left three schedulable games out of eight, and
   * three short ones all fit at every pace. Must-play is the opposite
   * population: finished games people actually logged hours against,
   * spanning a couple of hours to well over a hundred, which is both
   * the data this needs and a fair likeness of a real backlog.
   */
  const { data: games = [] } = useQuery({
    queryKey: queryKeys.shelf('landing-try'),
    queryFn: () => getMustPlayGames(1),
    select: (paged: Paged<Game>) => paged.results,
    staleTime: 6 * 60 * 60 * 1000,
  });
  /**
   * Read once, not in render. `Date.now()` during a render makes the
   * output a function of when React happened to run, which the compiler
   * rejects and a static export would bake in wrong anyway.
   */
  const [now] = useState(() => Date.now());

  /**
   * Real games, real lengths.
   *
   * RAWG's `playtime` is hours from people who logged the game, so this
   * is the same number the tiles carry everywhere else in the app. A
   * game with no reported length cannot be scheduled and is left out
   * rather than guessed at.
   */
  const items: PlanItem[] = games
    .filter((game) => game.playtime > 0)
    .slice(0, COUNT)
    .map((game) => ({ id: game.id, name: game.name, hours: game.playtime }));

  const { scheduled, dropped } = planSchedule(items, {
    hoursPerWeek: pace,
    now,
    deadline: now + HORIZON_WEEKS * WEEK_MS,
  });

  const byId = new Map(games.map((game) => [game.id, game]));
  const finishes = new Set(scheduled.map((item) => item.id));

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Rise from="mask">
        <Text style={styles.eyebrow}>Try it here. Nothing to sign up for.</Text>
      </Rise>
      <Words
        text="How much do you actually play?"
        style={[styles.lead, scale.lead]}
        delay={60}
      />

      <Rise delay={140}>
        <View style={styles.paces}>
          {PACES.map(({ hours, life, icon }) => {
            const on = hours === pace;
            return (
              <Pressable
                key={hours}
                onPress={() => setPace(hours)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${life} — about ${hours} hours a week`}
                style={[styles.pace, on && styles.paceOn]}
              >
                {/* The icon says the life before the word does — a
                    moon is read faster than "after bedtime" — and the
                    hours drop to a bare ≈Nh, because "a week" was said
                    once above and did not need saying four times. */}
                <Ionicons
                  name={icon}
                  size={20}
                  color={on ? COLORS.navy : COLORS.mediumGrey}
                />
                <Text style={[styles.paceLife, on && styles.paceLifeOn]}>
                  {life}
                </Text>
                <Text style={[styles.paceNumber, on && styles.paceNumberOn]}>
                  ≈{hours}h
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Rise>

      {/* Said once, plainly, because the page's biggest unspoken
          objection is "this is for people with more free time than
          me". The arithmetic does not care whose week it is, and that
          is the reassurance — not a promise that everyone will finish
          a lot. */}
      <Rise delay={170}>
        <Text style={styles.everyone}>
          A week is a week — school, shifts, work, kids, retirement. The
          arithmetic is the same; only the number changes.
        </Text>
      </Rise>

      <Rise delay={200}>
        {/* The sentence is the product's whole value in one line, and it
            is written by the scheduler rather than by a copywriter. */}
        <Text style={[styles.verdict, scale.body]}>
          In the next three months you would finish{' '}
          <Text style={styles.count}>{scheduled.length}</Text> of these{' '}
          {items.length}
          {scheduled.length > 0 ? ' — these ones:' : '. Not one of them.'}
        </Text>
      </Rise>

      <View style={styles.grid}>
        {items.map((item, index) => {
          const game = byId.get(item.id);
          if (!game) return null;
          return (
            <Verdict
              key={item.id}
              game={game}
              hours={item.hours}
              finishes={finishes.has(item.id)}
              index={index}
              wide={scale.wide}
            />
          );
        })}
      </View>

      {dropped.length > 0 && (
        <Text style={styles.footnote}>
          The dim ones are not failures — knowing which they are is the point.
          At {pace} hours a week, that is just arithmetic.
        </Text>
      )}
    </View>
  );
}

/**
 * One game, lit or not.
 *
 * The change is animated rather than switched, because the answer
 * changing is the entire feedback of this control: tapping 10h and
 * watching two more covers come up is the moment the page makes its
 * case. A hard cut would throw that away.
 */
function Verdict({
  game,
  hours,
  finishes,
  index,
  wide,
}: {
  game: Game;
  hours: number;
  finishes: boolean;
  index: number;
  wide: boolean;
}) {
  const reduced = useReducedMotion();
  const lit = useAnimatedValue(finishes ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      lit.setValue(finishes ? 1 : 0);
      return;
    }
    const animation = Animated.timing(lit, {
      toValue: finishes ? 1 : 0,
      duration: DURATION.base,
      // Down the row, so the answer arrives in reading order rather
      // than as one blink.
      delay: index * 45,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [lit, finishes, index, reduced]);

  /**
   * Alive under the pointer.
   *
   * Hover a game and its real screenshots cycle — the same living
   * preview every tile in the app already gives, and the pattern the
   * best product landing pages use, except the footage here is the
   * game itself rather than something rendered for marketing. Touch
   * screens never see a hover; they get the answer animation instead,
   * which is this band's real spectacle.
   */
  const [hovered, setHovered] = useState(false);
  const [shot, setShot] = useState(0);
  const stills = [
    game.background_image,
    ...(game.short_screenshots ?? [])
      .map((s) => s.image)
      .filter((image) => image !== game.background_image)
      .slice(0, 4),
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (!hovered || stills.length < 2) return;
    const timer = setInterval(
      () => setShot((i) => (i + 1) % stills.length),
      1100
    );
    return () => clearInterval(timer);
  }, [hovered, stills.length]);

  return (
    <Pressable
      style={wide ? styles.cellWide : styles.cell}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => {
        setHovered(false);
        // Back to the cover, so the grid rests in its designed state.
        setShot(0);
      }}
      accessibilityLabel={`${game.name}, ${hours} hours`}
    >
      <Animated.View
        style={{
          opacity: lit.interpolate({
            inputRange: [0, 1],
            outputRange: [0.28, 1],
          }),
          transform: [
            {
              scale: lit.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        }}
      >
        <CoverImage
          uri={stills[shot] ?? game.background_image}
          style={styles.art}
          size="thumb"
        />
        <Text style={styles.name} numberOfLines={1}>
          {game.name}
        </Text>
        <Animated.Text
          style={[
            styles.hours,
            {
              color: lit.interpolate({
                inputRange: [0, 1],
                outputRange: [COLORS.mediumGrey, COLORS.accent],
              }),
            },
          ]}
        >
          {hours}h
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.sm },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  lead: { color: COLORS.white, maxWidth: 900 },
  paces: {
    flexDirection: 'row',
    // Wraps, because the chips grew a caption and stopped fitting. Four
    // labelled chips are wider than a 390pt phone, and a row that
    // overflows does not look full — it looks like two of the four
    // answers are missing, which on the page's one control is the worst
    // possible thing to imply.
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    maxWidth: 620,
  },
  /**
   * A control the section is built around should look like one. These
   * were label-sized pills beside a fifty-four point question; they now
   * carry the same weight and hard-offset travel as the page's buttons,
   * because tapping them is the whole point of the band.
   */
  pace: {
    // A basis, not a width: the chips share whatever room there is,
    // which makes them two-by-two on a phone and four across on a
    // laptop, all identical in size at either. Four chips of four
    // different widths — one per caption length — read as a jumble.
    flexGrow: 1,
    flexBasis: 128,
    alignItems: 'center',
    gap: 3,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.strokeStrong,
  },
  paceOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    boxShadow: '0 4px 0 #B87A16',
  },
  paceLife: {
    fontFamily: 'Noah-Black',
    fontSize: 17,
    letterSpacing: -0.2,
    color: COLORS.lightGrey,
    textAlign: 'center',
  },
  paceLifeOn: { color: COLORS.navy },
  paceNumber: {
    ...TYPE.micro,
    fontSize: 11,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  // Dark on amber rather than the grey, which on the selected chip
  // fell to about 2:1 and vanished.
  paceNumberOn: { color: 'rgba(23,29,41,0.78)' },
  everyone: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    maxWidth: 560,
    marginTop: SPACING.md,
  },
  verdict: { marginTop: SPACING.lg, maxWidth: 620, color: COLORS.lightGrey },
  count: { color: COLORS.accent, fontFamily: 'Noah-Black' },
  /**
   * Four across, or two.
   *
   * Fixed-width cells left seven on one row and one stranded on the
   * next, and made the covers small enough to read as a legend rather
   * than as the eight games the sentence is about. Percentages with the
   * row justified fill the band exactly at both widths, and the covers
   * get big enough to be looked at.
   */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  cell: { width: '48%' },
  cellWide: { width: '23%' },
  art: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  name: { ...TYPE.h3, color: COLORS.white, marginTop: SPACING.sm },
  hours: { ...TYPE.tag, marginTop: 2 },
  footnote: {
    ...TYPE.caption,
    fontSize: 15,
    lineHeight: 23,
    marginTop: SPACING.lg,
    maxWidth: 560,
  },
});
