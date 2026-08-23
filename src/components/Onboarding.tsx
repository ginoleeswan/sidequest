import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { CoverImage } from './CoverImage';
import { Mark } from './Mark';
import { FadeInView } from './FadeInView';
import { Textured } from './Textured';
import { queryKeys } from '@/api/queryClient';
import { getMustPlayGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { usePersistedState } from '@/hooks/usePersistedState';
import { formatHours } from '@/lib/duration';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The covers, as the first screen's other half.
 *
 * On a phone the welcome is a column and that is the right shape. On a
 * desktop the same column sat in the middle of fourteen hundred pixels
 * of nothing — a mobile layout on a monitor, and, in an app about
 * games, a first impression containing no games at all.
 *
 * Two staggered columns of real artwork, dimmed and fading out towards
 * the copy so the words stay the subject. It is the app's own content,
 * which is the only honest thing to put here.
 */
function CoverWall({ games }: { games: Game[] }) {
  if (games.length < 4) return null;
  const columns = [games.slice(0, 3), games.slice(3, 6)];

  return (
    <View style={styles.wall} pointerEvents="none">
      {columns.map((column, index) => (
        <View
          key={index}
          style={[styles.wallColumn, index === 1 && styles.wallColumnOffset]}
        >
          {column.map((game) => (
            <CoverImage
              key={game.id}
              uri={game.background_image}
              style={styles.wallCover}
              size="tile"
              iconSize={24}
            />
          ))}
        </View>
      ))}
      {/* The words are the subject; the wall arrives out of them. */}
      <LinearGradient
        colors={[COLORS.navy, 'rgba(39,47,63,0.65)', 'rgba(39,47,63,0)']}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * The backlog, as a hand of cards — and then as a shortlist.
 *
 * The screen has one sentence to make credible, and it is the lede's
 * second half: works out what you can actually finish, and gives you
 * permission to skip the rest. Type alone cannot say that. Five covers
 * arrive, three go dark, two stay lit — the sentence as a picture, and
 * the reason the animation is here rather than being decoration.
 *
 * The same argument LandingWall makes, deliberately in a different
 * form. That wall is a grid driven by scrolling, and it shows on phones
 * too, so a reader arriving from the web has already seen it; restating
 * the idea as a hand of cards driven by arrival reads as the product
 * having a voice, where pasting the same grid twice would read as a
 * loop. There is also nothing to scroll here — this is a fixed modal,
 * so the wall's mechanism has nothing turning it.
 *
 * Real covers from the query that seeds act three. Additive, never
 * load-bearing: a cold first run with no network draws nothing and the
 * screen still reads, which is why this sits above the copy instead of
 * behind it.
 */
/**
 * Portrait, because box art is portrait.
 *
 * Drawn first at 132x88 — the shape RAWG's artwork actually arrives in
 * — overlapped by 59%. Each card showed a 54px sliver of a wide
 * screenshot, and five of those read as a smudge rather than as games.
 * Cropping to 3:4 and overlapping by a third gives each card enough face to
 * be recognised as a cover, which is the entire point of showing them.
 */
const FAN_W = 96;
const FAN_H = 128;
const FAN_STEP = 62;
/** Splayed from the middle, so the run arcs rather than leaning. */
const FAN_TILT = [-12, -6, 0, 6, 12];
const FAN_LIFT = [18, 5, 0, 5, 18];
/** The two you would actually get to. Everything else goes out. */
const FAN_KEEPS = [1, 2];
const FAN_DIM = 0.16;

function BacklogFan({ games }: { games: Game[] }) {
  const reduced = useReducedMotion();
  const run = useAnimatedValue(reduced ? 1 : 0);
  const cards = games.slice(0, FAN_TILT.length);
  const enough = cards.length === FAN_TILT.length;

  useEffect(() => {
    if (reduced || !enough) return;
    const animation = Animated.timing(run, {
      toValue: 1,
      duration: 1900,
      delay: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [run, reduced, enough]);

  if (!enough) return null;
  const span = FAN_W + FAN_STEP * (cards.length - 1);

  return (
    <View
      style={[styles.fan, { width: span, height: FAN_H + 34 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {cards.map((game, i) => {
        const keeps = FAN_KEEPS.includes(i);
        // Dealt left to right, the way a hand is.
        const dealt = 0.06 * i;
        const deal = (from: number, to: number) =>
          run.interpolate({
            inputRange: [dealt, dealt + 0.28],
            outputRange: [from, to],
            extrapolate: 'clamp',
          });
        return (
          <Animated.View
            key={game.id}
            style={[
              styles.fanCard,
              {
                left: i * FAN_STEP,
                top: FAN_LIFT[i],
                transform: [
                  { translateY: deal(26, 0) },
                  // Lands flat and settles into its tilt, so the run
                  // arrives as a hand rather than as five fading boxes.
                  {
                    rotate: deal(0, FAN_TILT[i]).interpolate({
                      inputRange: [-12, 12],
                      outputRange: ['-12deg', '12deg'],
                    }),
                  },
                ],
                opacity: keeps
                  ? deal(0, 1)
                  : run.interpolate({
                      // Arrives, holds, then goes out — staggered from
                      // the outside in so the pile reads as emptying
                      // rather than as one dip in brightness.
                      inputRange: [
                        dealt,
                        dealt + 0.28,
                        0.55 + Math.abs(i - 2) * 0.06,
                        0.85 + Math.abs(i - 2) * 0.04,
                      ],
                      outputRange: [0, 1, 1, FAN_DIM],
                      extrapolate: 'clamp',
                    }),
              },
            ]}
          >
            <CoverImage
              uri={game.background_image}
              style={styles.fanArt}
              contentFit="cover"
              size="tile"
              iconSize={20}
            />
          </Animated.View>
        );
      })}
      {/* The run does not end, it recedes. Without this the bottom edge
          is a hard line of five rectangles and reads as a gallery. */}
      <LinearGradient
        colors={['rgba(39,47,63,0)', 'rgba(39,47,63,0.72)', COLORS.navy]}
        locations={[0, 0.66, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const PACES: {
  title: string;
  line: string;
  hours: number;
}[] = [
  {
    title: 'A couple of evenings',
    line: 'Work, life, and the occasional boss fight.',
    hours: 4,
  },
  {
    title: 'Most nights',
    line: 'A steady hour or two once the day winds down.',
    hours: 8,
  },
  {
    title: 'It’s my main thing',
    line: 'Weekends were invented for this.',
    hours: 15,
  },
];

/**
 * Routes that must never be covered by the setup flow: the pages whose
 * whole job is to be read by somebody who has not started yet.
 */
const PUBLIC_ROUTES = ['/about', '/privacy', '/terms', '/shared'];

/** How many games act three offers for the first saves. */
const PICKS = 6;

function PickTile({
  game,
  saved,
  onToggle,
  width,
}: {
  game: Game;
  saved: boolean;
  onToggle: () => void;
  width: number;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.pick, { width }, saved && styles.pickSaved]}
      accessibilityRole="button"
      accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${game.name}`}
    >
      <CoverImage uri={game.background_image} style={styles.pickArt} />
      <View style={[styles.pickBadge, saved && styles.pickBadgeSaved]}>
        <Ionicons
          name={saved ? 'checkmark' : 'add'}
          size={14}
          color={saved ? COLORS.darkGrey : COLORS.white}
        />
      </View>
      <Text style={styles.pickName} numberOfLines={1}>
        {game.name}
      </Text>
    </Pressable>
  );
}

/**
 * First visit: three short acts instead of a brochure. The promise, then
 * your real pace (it seeds The Plan), then a handful of games with known
 * lengths to save — so the product is already personal, and already
 * plannable, before the first browse.
 * Shows once, skippable at every step, persisted.
 */
export function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setStatus, statusOf } = useLibrary();

  const [done, setDone] = usePersistedState('sidequest.onboarded.v1', false);
  const [, setPlanPace] = usePersistedState('sidequest.plan.pace', 6);
  const [step, setStep] = useState(0);
  const [pace, setPace] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const mounted = useHydrated();
  const { isExpanded } = useBreakpoint();
  const pathname = usePathname();

  /**
   * The pages that exist for people who have not used this yet.
   *
   * A stranger following a link to the about page is being asked to
   * decide whether to try Sidequest at all, and covering that page with
   * a setup flow answers a question they have not asked. The same goes
   * for the legal pages, which people reach on purpose and from
   * elsewhere.
   */
  const readingAbout = PUBLIC_ROUTES.some((route) => pathname === route);

  /**
   * Must-play, not trending — and the difference decides whether the
   * app works on first run.
   *
   * Trending on RAWG means recently added, which means mostly
   * unreleased, and an unreleased game has no reported length. Six of
   * those are six games the scheduler cannot place: measured on a fresh
   * install, saving all six produced a plan reading "This window is too
   * tight" over five rows of "Length unknown". The first thing the app
   * ever does was tell the reader it could not help them.
   *
   * `LandingTry` hit this and wrote it down — must-play is the opposite
   * population, games people finished and logged real hours against —
   * but the fix never reached the one screen where it matters most.
   *
   * Belt and braces: the filter stays even on this population, because
   * "no reported length" is a property of a game, not of a shelf, and
   * one slipping through would put an unplaceable game in somebody's
   * first plan.
   */
  const seeds = useQuery({
    queryKey: queryKeys.shelf('onboarding-picks'),
    queryFn: () => getMustPlayGames(1),
    select: (page: Paged<Game>) => page.results,
    enabled: mounted && !done,
  });
  const picks: Game[] = (seeds.data ?? [])
    .filter((game) => game.playtime > 0)
    .slice(0, PICKS);

  if (!mounted || done || readingAbout) return null;

  const finish = (toPlan: boolean) => {
    setDone(true);
    if (toPlan) router.push('/plan');
  };

  /**
   * What they have saved, and what it would take them.
   *
   * Act two asked for a pace; this is where that answer starts paying.
   * Rather than telling the reader their saves "become your first plan",
   * the screen works the plan out in front of them — which is the
   * product's one trick, performed before they have finished signing up
   * for it.
   *
   * Derived from the library rather than counted separately: the tiles
   * already read their state from `statusOf`, and a tally kept beside
   * them is a second source of truth waiting to disagree.
   */
  const savedGames = picks.filter((game) => statusOf(game.id) === 'wishlist');
  const savedHours = savedGames.reduce((sum, game) => sum + game.playtime, 0);
  const weeks = savedHours / (pace ?? 6);

  const contentWidth = Math.min(width - SPACING.lg * 2, 460);
  const tileWidth = (contentWidth - SPACING.sm * 2) / 3;

  const acts = [
    // -------------------------------------------------- act 1: the hook
    <View key="hook" style={styles.act}>
      {!isExpanded && <BacklogFan games={picks} />}

      <Text style={styles.display}>Your backlog isn’t{'\n'}a to-do list.</Text>
      {/* The fan just showed five games, so "Sidequest finds your next
          game" was the sentence repeating the picture. What is left is
          the half no image can carry. */}
      <Text style={styles.lede}>
        It works out what you can actually finish — and gives you permission to
        skip the rest.
      </Text>
      <Pressable
        onPress={() => setStep(1)}
        style={[styles.cta, isExpanded && styles.ctaInline]}
      >
        {/* "Set me up — 20 seconds" bargained before the reader had
            agreed to anything, and About already settled this argument
            on its own cap: a cabinet does not explain itself, it says
            START. Nothing hedges underneath it either — the way out is
            "Skip", top right, on all three acts. */}
        <Text style={styles.ctaText}>Set me up</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.darkGrey} />
      </Pressable>
    </View>,

    // -------------------------------------------------- act 2: your pace
    <View key="pace" style={styles.act}>
      <Text style={styles.actLabel}>YOUR PACE</Text>
      <Text style={styles.display}>How much do{'\n'}you really play?</Text>
      <Text style={styles.lede}>
        Be honest — this is what makes the plan trustworthy.
      </Text>
      <View style={styles.paceList}>
        {PACES.map((option) => {
          const selected = pace === option.hours;
          return (
            <Pressable
              key={option.hours}
              onPress={() => {
                setPace(option.hours);
                setPlanPace(option.hours);
                setTimeout(() => setStep(2), 260);
              }}
              style={[styles.paceCard, selected && styles.paceCardSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${option.title}, about ${option.hours} hours a week`}
            >
              {/* The number leads, because the number is the choice.
                  This row carried a moon, a controller and a lightning
                  bolt — evocative, and telling the reader nothing the
                  words beside them did not. The hours are the only
                  thing here anybody is actually deciding between, and
                  they were set small and grey off to the right. */}
              <View style={styles.paceHoursBox}>
                <Text
                  style={[
                    styles.paceHoursNum,
                    selected && styles.paceHoursNumSelected,
                  ]}
                >
                  {option.hours}
                </Text>
                <Text
                  style={[
                    styles.paceHoursUnit,
                    selected && styles.paceLineSelected,
                  ]}
                >
                  h / week
                </Text>
              </View>
              <View style={styles.paceBody}>
                <Text
                  style={[
                    styles.paceTitle,
                    selected && styles.paceTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>
                <Text
                  style={[styles.paceLine, selected && styles.paceLineSelected]}
                >
                  {option.line}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {/* "or measure it from Steam" read as a link, was not one, and
          pointed at an import that would have to leave onboarding
          half-finished to reach. The reassurance that matters is that
          this is not a decision they are stuck with. */}
      <Text style={styles.quiet}>You can change this later.</Text>
    </View>,

    // -------------------------------------------------- act 3: first saves
    <View key="picks" style={styles.act}>
      <Text style={styles.actLabel}>FIRST SAVES</Text>
      <Text style={styles.display}>
        Been meaning to{'\n'}play any of these?
      </Text>
      {/* "Or skip; the bookmark is everywhere" named an affordance
          nobody has seen yet — the reader has not met a bookmark, and
          the way out of this screen is the Skip they have had all
          along. What is worth saying is what a tap does. */}
      <Text style={styles.lede}>
        Tap the ones you have been meaning to play.
      </Text>
      <View style={styles.pickGrid}>
        {picks.map((game) => {
          const saved = statusOf(game.id) === 'wishlist';
          return (
            <PickTile
              key={game.id}
              game={game}
              saved={saved}
              width={tileWidth}
              onToggle={() => {
                setStatus(game, saved ? null : 'wishlist');
                setSavedCount((count) => count + (saved ? -1 : 1));
              }}
            />
          );
        })}
      </View>
      {/* The plan, arriving as they tap. Held to one line and one
          decimal-free number: this is a promise being demonstrated, not
          a readout. */}
      {savedGames.length > 0 && (
        <Text style={styles.tally}>
          <Text style={styles.tallyStrong}>{formatHours(savedHours)}</Text> of
          play — about{' '}
          <Text style={styles.tallyStrong}>
            {weeks < 1.5 ? 'a week' : `${Math.round(weeks)} weeks`}
          </Text>{' '}
          at {pace ?? 6}h a week.
        </Text>
      )}
      <Pressable
        onPress={() => finish(savedCount > 0)}
        style={[styles.cta, isExpanded && styles.ctaInline]}
      >
        <Text style={styles.ctaText}>
          {savedCount > 0
            ? `Build my plan — ${savedCount} saved`
            : 'Start exploring'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.darkGrey} />
      </Pressable>
    </View>,
  ];

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => finish(false)}
    >
      <Textured style={styles.screen}>
        <View style={[styles.chrome, { top: insets.top + SPACING.md }]}>
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityLabel="Back"
              style={styles.chromeButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={COLORS.mediumGrey}
              />
            </Pressable>
          ) : (
            /* The mark, where the splash left it.
               "WELCOME TO / SIDEQUEST" said the name twice and welcomed
               nobody — the reader has just watched this joystick settle
               on the launch screen, so carrying it in beats announcing
               it. It sits in the chrome rather than the column because a
               masthead that floats in the middle of a page is not a
               masthead; the back button takes this slot from step two
               on, by which point the name has been made. */
            <View style={styles.masthead}>
              <Mark size={24} />
              <Text style={styles.mastheadWord}>SIDEQUEST</Text>
            </View>
          )}
          <Pressable onPress={() => finish(false)}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        {isExpanded ? (
          <View style={styles.split}>
            <View style={styles.copyColumn}>
              <FadeInView key={step}>{acts[step]}</FadeInView>
            </View>
            <CoverWall games={seeds.data ?? []} />
          </View>
        ) : (
          <View style={[styles.stage, { width: contentWidth }]}>
            <FadeInView key={step}>{acts[step]}</FadeInView>
          </View>
        )}

        <View style={[styles.dots, { bottom: insets.bottom + SPACING.xl }]}>
          {acts.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step && styles.dotActive]}
            />
          ))}
        </View>
      </Textured>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    /**
     * The same ground as every other screen, exactly.
     *
     * This was darkGrey — one step lighter than the app's navy — and
     * onboarding was the only page on it. The iOS toolbar takes its
     * colour from the page, so the first screen anyone ever sees was
     * also the only one where the browser chrome and the page did not
     * match. The welcome mat cannot be the one tile laid in the wrong
     * colour.
     */
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chrome: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  chromeButton: { width: 36, height: 36, justifyContent: 'center' },
  skip: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
    padding: SPACING.sm,
  },
  stage: { maxWidth: 460 },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1180,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
  },
  copyColumn: { width: 480, flexShrink: 0, zIndex: 2 },
  wall: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  wallColumn: { gap: SPACING.md, flex: 1, maxWidth: 240 },
  /** Staggered, so it reads as a wall rather than a table. */
  wallColumnOffset: { marginTop: SPACING.xl * 2 },
  wallCover: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    opacity: 0.75,
  },
  act: { gap: SPACING.md, alignItems: 'flex-start' },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mastheadWord: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    letterSpacing: 4,
    color: COLORS.white,
  },

  /**
   * The fan sits above the copy, and centres itself rather than the
   * column: the cards are rotated, so their box is wider than the art
   * and letting it stretch the act would push the headline off-centre.
   */
  fan: { alignSelf: 'center', marginBottom: SPACING.xl * 1.25 },
  fanCard: {
    position: 'absolute',
    width: FAN_W,
    height: FAN_H,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: COLORS.surface,
  },
  fanArt: { width: '100%', height: '100%' },

  eyebrow: {
    ...TYPE.tag,
    color: COLORS.mediumGrey,
  },
  wordmark: {
    ...TYPE.title,
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  actLabel: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  display: {
    ...TYPE.display,
    color: COLORS.white,
  },
  lede: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 1,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.white,
    alignSelf: 'stretch',
    marginTop: SPACING.sm,
  },
  /**
   * On a phone a full-width button is the target you want. Stretched
   * across a desktop copy column it is a 660px pill, which reads as a
   * banner rather than as something to press.
   */
  ctaInline: { alignSelf: 'flex-start' },
  ctaText: {
    ...TYPE.h3,
    color: COLORS.darkGrey,
  },
  tally: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.md,
    marginBottom: -SPACING.xs,
  },
  tallyStrong: { fontFamily: 'Noah-Bold', color: COLORS.white },

  quiet: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    alignSelf: 'center',
    padding: SPACING.xs,
  },

  // act 2
  paceList: { gap: SPACING.sm, alignSelf: 'stretch' },
  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.raised,
  },
  paceCardSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  paceHoursBox: { width: 62, alignItems: 'flex-start' },
  paceHoursNum: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    lineHeight: 32,
    color: COLORS.accent,
  },
  paceHoursNumSelected: { color: COLORS.darkGrey },
  paceHoursUnit: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    letterSpacing: 1,
  },
  paceBody: { flex: 1, gap: 1 },
  paceTitle: {
    ...TYPE.h4,
    color: COLORS.lightGrey,
  },
  paceTitleSelected: { color: COLORS.darkGrey },
  paceLine: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  paceLineSelected: { color: 'rgba(30,36,50,0.7)' },
  paceHours: {
    ...TYPE.h4,
    color: COLORS.mediumGrey,
  },

  // act 3
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignSelf: 'stretch',
  },
  pick: { gap: 4 },
  pickSaved: {},
  pickArt: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  pickBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(13,17,25,0.72)',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBadgeSaved: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  pickName: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
  },

  dots: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: { backgroundColor: COLORS.white, width: 18 },
});
