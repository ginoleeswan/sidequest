import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LandingProof } from '@/components/LandingProof';
import { LandingWall } from '@/components/LandingWall';
import { Mark } from '@/components/Mark';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { ScaleButton } from '@/components/ScaleButton';
import { SiteFooter } from '@/components/SiteFooter';
import { GrainScrim, Textured } from '@/components/Textured';
import { WhenNear } from '@/components/WhenNear';
import { YearBlocks } from '@/components/YearBlocks';
import { queryKeys } from '@/api/queryClient';
import { getTrendingGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * The page for people who have not used it yet.
 *
 * Everywhere else in Sidequest is a tool being used. This is the one
 * surface that has to make the case cold, to somebody who followed a
 * link and will give it eight seconds — so it is built like a poster
 * rather than like a screen: one idea at a time, set large, with the
 * app's own objects doing the illustrating.
 *
 * Deliberately not a feature grid. Three cards with an icon, a title and
 * two lines of body is what a page looks like when nobody decided what
 * mattered most; the order and the scale here are the argument.
 */

/** A plausible year, for the card that has no data of its own to show. */
const SAMPLE_YEAR = [1, 0, 2, 1, 0, 1, 3, 2, 4, 2, 1, 3];

const BEATS = [
  {
    kind: 'length' as const,
    lead: 'It knows how long things take.',
    body: 'Every game carries a real length, from the people who have finished it — not a guess, and not a store page. It is on every tile, in amber, before you tap anything.',
  },
  {
    kind: 'tonight' as const,
    lead: 'It picks what fits tonight.',
    body: 'Ninety minutes on a Tuesday is not three hours on a Saturday. Sidequest does the arithmetic and names one game.',
  },
  {
    kind: 'drop' as const,
    lead: 'It lets you put things down.',
    body: 'Most of a backlog is never going to be played, and saying so out loud is the only thing that makes the rest enjoyable. It asks why, and only so the shelves can learn something.',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const { isExpanded, width } = useBreakpoint();
  const { height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enter = useAnimatedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, reduced]);

  /**
   * One timeline, four arrivals — the same device the home stage uses,
   * so the two front doors of this product move the same way.
   */
  const step = (from: number, to: number) => ({
    opacity: enter.interpolate({
      inputRange: [from, to],
      outputRange: [0, 1],
      extrapolate: 'clamp' as const,
    }),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [from, to],
          outputRange: [16, 0],
          extrapolate: 'clamp' as const,
        }),
      },
    ],
  });

  /**
   * The masthead scales with the page rather than sitting on the app's
   * heading scale. A landing line set at a UI size is a caption; this
   * one has to carry a screen on its own.
   */
  const display = Math.round(Math.min(Math.max(width * 0.098, 38), 104));
  /**
   * The sum, set as the number it is.
   *
   * Ninety-six points is the app's watermark numeral, which is right
   * behind a tile and small for a statement that has a whole band to
   * itself. This is the single most persuasive thing on the page, so it
   * gets the room.
   */
  const sum = Math.round(Math.min(Math.max(width * 0.15, 84), 196));
  const figure = {
    fontSize: sum,
    lineHeight: Math.round(sum * 0.92),
    letterSpacing: Math.round(sum * -0.055),
  };
  const unit = { fontSize: Math.round(sum * 0.42) };
  const masthead = {
    fontSize: display,
    lineHeight: Math.round(display * 1.02),
    letterSpacing: display > 60 ? -3 : -1.2,
  };
  const inset = isExpanded ? SPACING.xl * 2 : SPACING.lg;

  /**
   * The same games the wall is built from, so the demonstrations below
   * cost nothing: one request, already in flight before this reads it.
   */
  const { data: games } = useQuery({
    queryKey: queryKeys.shelf('landing-wall'),
    queryFn: () => getTrendingGames(1),
    select: (page: Paged<Game>) => page.results,
    staleTime: 6 * 60 * 60 * 1000,
  });

  const open = (
    <ScaleButton
      onPress={() => router.push('/')}
      style={styles.cta}
      activeScale={0.97}
      hoverScale={1.03}
      accessibilityLabel="Open Sidequest"
    >
      <Text style={styles.ctaLabel}>Open Sidequest</Text>
      <Ionicons name="arrow-forward" size={16} color={COLORS.navy} />
    </ScaleButton>
  );

  return (
    <Textured style={styles.background}>
      <PageTitle>About Sidequest</PageTitle>
      {/* No safe-area view around this. Reserving the top inset put a
          band of flat page colour above the hero and stopped the
          artwork reaching the top of the screen; the copy clears the
          status bar on its own instead. */}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.masthead,
            { minHeight: Math.max(Math.round(height * 0.94), 560) },
          ]}
        >
          <LandingWall columns={isExpanded ? 7 : 4} />
          {/* Heavy where the words are, open at the top right, so the
                pile is visible without ever competing with the line it
                exists to prove. */}
          <LinearGradient
            colors={[
              'rgba(51,61,81,0.55)',
              'rgba(51,61,81,0.80)',
              'rgba(51,61,81,0.97)',
              COLORS.darkGrey,
            ]}
            locations={[0, 0.42, 0.78, 1]}
            start={{ x: 0.75, y: 0 }}
            end={{ x: 0.15, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={[
              styles.mastheadCopy,
              { paddingHorizontal: inset, paddingTop: safe.top + SPACING.xl },
            ]}
          >
            {/* No back chevron. Most people reach this page from a link
                  and have nowhere to go back to; the ones who came from
                  the footer have a browser button and the mark below. */}
            <Animated.View style={[styles.lockup, step(0, 0.35)]}>
              <Mark size={26} />
              <Text style={styles.word}>SIDEQUEST</Text>
            </Animated.View>
            <Animated.Text style={[styles.headline, masthead, step(0.08, 0.6)]}>
              Know what you can actually finish.
            </Animated.Text>
            <Animated.Text style={[styles.standfirst, step(0.2, 0.75)]}>
              Forty games waiting. Three you will actually see the end of.
              Sidequest works out which three.
            </Animated.Text>
            <Animated.View style={step(0.32, 0.9)}>{open}</Animated.View>
          </View>
        </View>

        {/* The arithmetic nobody does for themselves, set as the number
              it is. This is the whole case for the product, and it is
              more persuasive than any sentence about it. */}
        <WhenNear placeholder={<View style={styles.sumRoom} />}>
          <View style={styles.band}>
            <View
              style={[
                styles.sum,
                { paddingHorizontal: inset },
                isExpanded && styles.sumWide,
              ]}
            >
              <View style={isExpanded && styles.sumFigureWide}>
                <Text style={styles.sumLead}>The average backlog is</Text>
                <Text style={[styles.sumFigure, figure]}>
                  900
                  <Text style={[styles.sumUnit, unit]}>h</Text>
                </Text>
              </View>
              <Text style={[styles.sumTail, isExpanded && styles.sumTailWide]}>
                and the average week has about six in it. That is fifteen years
                of evenings, which is not a to-do list — it is a fantasy about a
                different life.
              </Text>
            </View>
          </View>
        </WhenNear>

        {BEATS.map((beat, index) => (
          <View
            key={beat.lead}
            style={[
              styles.beat,
              { paddingHorizontal: inset },
              isExpanded && styles.beatWide,
              // Every other one turned around. Three identical
              // two-column splits stacked is a table; alternating them
              // is what makes a reader's eye travel down a page.
              isExpanded && index % 2 === 1 && styles.beatFlipped,
            ]}
          >
            <Text style={[styles.beatLead, isExpanded && styles.beatLeadWide]}>
              {beat.lead}
            </Text>
            <View style={isExpanded ? styles.beatBodyWide : undefined}>
              <Text style={styles.beatBody}>{beat.body}</Text>
              {/* The app's own components, fed real data: a claim with
                  the thing itself under it beats a claim with an icon
                  over it. */}
              <LandingProof kind={beat.kind} game={games?.[index + 2]} />
            </View>
          </View>
        ))}

        {/* The app's own object, at the size it deserves. */}
        <View style={[styles.band, styles.card, { paddingHorizontal: inset }]}>
          <View style={styles.cardFrame}>
            <GrainScrim style={StyleSheet.absoluteFill} />
            <YearBlocks
              months={SAMPLE_YEAR}
              landed={null}
              size={isExpanded ? 26 : 17}
            />
          </View>
          <Text style={styles.cardCaption}>
            A year of finishing things. One block for every set of credits you
            actually reach.
          </Text>
        </View>

        <View
          style={[
            styles.plain,
            { paddingHorizontal: inset },
            isExpanded && styles.plainWide,
          ]}
        >
          <View style={isExpanded ? styles.plainCopy : undefined}>
            <Text style={styles.plainLead}>No account. No tracking.</Text>
            <Text style={styles.plainBody}>
              Your library lives in your browser and goes nowhere. There is
              nothing to sign up for, nothing to cancel, and nobody selling what
              you play. Game data comes from RAWG; lengths come from IGDB and
              from you.
            </Text>
            <Text style={styles.plainBody}>
              An independent project, not affiliated with any platform,
              publisher or store. Open source at ginoleeswan/sidequest.
            </Text>
          </View>
          <View style={[styles.closeCta, isExpanded && styles.closeCtaWide]}>
            {open}
          </View>
        </View>

        {/* No bleed: this page pads its sections, not its scroller. */}
        <SiteFooter pad={inset} />
      </ScrollView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  // Centred past the cap, or a 4K monitor gets the whole page pinned to
  // its left edge with half a screen of nothing beside it.
  scroll: {
    maxWidth: LAYOUT.maxExpandedWidth,
    width: '100%',
    alignSelf: 'center',
  },

  // masthead
  masthead: { justifyContent: 'flex-end', overflow: 'hidden' },
  mastheadCopy: { paddingBottom: SPACING.xl * 2 },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginBottom: SPACING.xl,
  },
  word: { ...TYPE.h1, color: COLORS.lightGrey },
  headline: {
    fontFamily: 'Noah-Black',
    ...OVER_IMAGE.heading,
    color: COLORS.white,
    maxWidth: 860,
    marginBottom: SPACING.lg,
  },
  standfirst: {
    ...TYPE.body,
    ...OVER_IMAGE.body,
    // The step between the masthead and the body. Straight from a
    // hundred points to seventeen is a cliff, and the eye reads a cliff
    // as two unrelated things rather than as one thought continuing.
    fontSize: 21,
    lineHeight: 31,
    color: COLORS.lightGrey,
    maxWidth: 520,
    marginBottom: SPACING.xl,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 15,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
  },
  ctaLabel: { ...TYPE.label, color: COLORS.navy },

  /**
   * Bands, not hairlines.
   *
   * Every section shared one background and was separated by a rule,
   * which reads as one long scroll with faint lines in it rather than
   * as a page with parts. Alternating the ground is what gives a
   * landing page its rhythm, and it works at both widths — where an
   * asymmetric column layout only works at one.
   */
  band: { backgroundColor: COLORS.navy },

  // the sum
  sumRoom: { height: 320 },
  sum: { paddingVertical: SPACING.xl * 2 },
  sumWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 2,
  },
  sumFigureWide: { flexShrink: 0 },
  sumTailWide: { flex: 1, maxWidth: 560 },
  sumLead: { ...TYPE.micro, color: COLORS.mediumGrey },
  sumFigure: {
    ...TYPE.numeral,
    color: COLORS.accent,
    marginVertical: SPACING.sm,
  },
  sumUnit: { ...TYPE.numeral, fontSize: 48, color: COLORS.accent },
  sumTail: {
    ...TYPE.body,
    fontSize: 17,
    lineHeight: 27,
    color: COLORS.lightGrey,
    maxWidth: 520,
  },

  // the three beats
  beat: { paddingVertical: SPACING.xl, gap: SPACING.md },
  beatWide: {
    flexDirection: 'row',
    // Tops aligned, not centres. Centred against a tall column the lead
    // floated in the middle of its own row with nothing beside it,
    // reading as two unrelated things rather than a claim and its
    // evidence.
    alignItems: 'flex-start',
    gap: SPACING.xl * 2,
  },
  beatFlipped: { flexDirection: 'row-reverse' },
  beatLead: { ...TYPE.title, color: COLORS.white, maxWidth: 420 },
  beatLeadWide: { flex: 1.1 },
  beatBody: {
    ...TYPE.body,
    fontSize: 16,
    lineHeight: 26,
    color: COLORS.mediumGrey,
    maxWidth: 480,
  },
  beatBodyWide: { flex: 1 },

  // the card
  card: {
    paddingVertical: SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  cardFrame: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    // A shade under the band it now sits on. Navy on navy would have
    // been an object vanishing into the ground it was placed on.
    backgroundColor: '#1F2634',
    overflow: 'hidden',
  },
  cardCaption: {
    ...TYPE.caption,
    textAlign: 'center',
    maxWidth: 380,
  },

  // the plain truth
  plain: { paddingVertical: SPACING.xl * 2, gap: SPACING.md },
  plainWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.xl * 2,
  },
  plainCopy: { flex: 1, gap: SPACING.md },
  closeCtaWide: { marginTop: 0, flexShrink: 0 },
  plainLead: { ...TYPE.title, color: COLORS.white },
  plainBody: {
    ...TYPE.body,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.mediumGrey,
    maxWidth: 560,
  },
  closeCta: { marginTop: SPACING.lg },
});

/**
 * expo-router renders this instead of the route when its render throws,
 * so one bad screen degrades locally rather than blanking the app.
 */
export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
