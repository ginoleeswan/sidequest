import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureIndex } from '@/components/FeatureIndex';
import { Horizon } from '@/components/Horizon';
import { HowItWorks } from '@/components/HowItWorks';
import { LandingShelf } from '@/components/LandingShelf';
import { LandingTake } from '@/components/LandingTake';
import { LandingTry } from '@/components/LandingTry';
import { MemcardBuild } from '@/components/MemcardBuild';
import { QuestLine, QuestMark } from '@/components/QuestLine';
import { LandingProof } from '@/components/LandingProof';
import { Drift } from '@/components/Drift';
import { Rise, useInView } from '@/components/Rise';
import { Words } from '@/components/Words';
import { LandingWall } from '@/components/LandingWall';
import { MarkDraw } from '@/components/MarkDraw';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { ScaleButton } from '@/components/ScaleButton';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { WhenNear } from '@/components/WhenNear';
import { queryKeys } from '@/api/queryClient';
import { getTrendingGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useCountUp } from '@/hooks/useCountUp';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import {
  LANDING_GROUND,
  LANDING_MEASURE,
  LANDING_WELL,
  landingScale,
  type LandingScale,
} from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
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

/**
 * A year's card, built from whatever games the wall happened to load.
 *
 * The alternative was a hand-drawn mock-up of the card, which would be
 * a picture of a feature rather than the feature — and would quietly
 * rot the first time the real one changed. This is the app's own
 * renderer, given the app's own shape of data.
 */
const FINISHED_MONTHS = [0, 2, 3, 5, 6, 8, 9, 11];
const FINISHED_HOURS = [11, 34, 8, 62, 17, 26, 9, 41];

function sampleCard(games: Game[] | undefined): MemcardModel {
  const blocks = FINISHED_MONTHS.map((month, index) => ({
    id: games?.[index]?.id ?? index,
    name: games?.[index]?.name ?? 'A game you finished',
    hours: FINISHED_HOURS[index],
    month,
  }));
  const hours = FINISHED_HOURS.reduce((sum, value) => sum + value, 0);
  const longest = blocks.reduce((best, block) =>
    best.hours >= block.hours ? best : block
  );

  return {
    year: 2025,
    count: blocks.length,
    hours,
    blocks,
    longest,
    headline: 'Eight games. Two hundred and eight hours.',
    subhead: 'A good year for finishing things.',
  };
}

/**
 * Each beat owns a colour as well as a claim: amber for time, violet
 * for the evening, coral for letting go. The marker, the lead's key
 * word and the evidence all speak in it, so the three ideas stop
 * being three paragraphs and start being three places.
 */
const BEATS = [
  {
    kind: 'length' as const,
    hue: COLORS.accent,
    lead: 'It knows how long things take.',
    body: 'Real lengths from players who finished, on every tile — before you tap.',
  },
  {
    kind: 'tonight' as const,
    hue: COLORS.violet,
    lead: 'It picks what fits tonight.',
    body: 'A Tuesday is not a Saturday. It does the arithmetic and names one game.',
  },
  {
    kind: 'drop' as const,
    hue: COLORS.coral,
    lead: 'It lets you put things down.',
    body: 'Most of a backlog will never be played. Saying so is the fun part.',
  },
];

/**
 * The number, counted rather than printed.
 *
 * It owns its own ref, which is the whole reason it is a component: the
 * hook lived on the screen while the element it watched lived inside a
 * section deferred until it is scrolled near. The ref was therefore null
 * when the observer went looking, `useInView` took its "nothing to
 * observe, so show it" fallback, and the count ran and finished at load
 * every time. A ref declared in a parent and attached in a subtree that
 * has not rendered is not attached at all.
 */
function Sum({
  style,
  figure,
  unit,
}: {
  style?: ViewStyle;
  figure: TextStyle;
  unit: TextStyle;
}) {
  const [ref, seen] = useInView('-30%');
  const hours = useCountUp(900, 0, seen);

  return (
    <View ref={ref} style={style}>
      <Text style={styles.sumLead}>The average backlog is</Text>
      {/* The unit is a sibling on the baseline, not a nested Text.
          Nested, it inherited the figure's tracking — and the figure is
          tracked at minus three percent, which on a 21px glyph is a
          collision rather than a style. It also stopped being a shrunken
          digit and became a word, because "900h" is a stopwatch reading
          and this is a sentence about somebody's life. */}
      <View style={styles.sumLine}>
        <Text style={[styles.sumFigure, figure]}>{Math.round(hours)}</Text>
        <Text style={[styles.sumUnit, unit]}>hours</Text>
      </View>
    </View>
  );
}

/**
 * A full-bleed stripe with a measured column inside it.
 *
 * Both halves matter. The stripe reaches both edges of the window, so
 * alternating grounds actually read as bands rather than as a centred
 * ribbon with page colour either side of it. The column inside is capped
 * at a reading measure, so a claim set at fifty-four points does not
 * find itself alone at the left edge of a 1440px row — which is exactly
 * what the page did before, and exactly what "awkward grey space" looks
 * like when you take a photograph of it.
 */
function Band({
  scale,
  tone = 'ground',
  style,
  raise = false,
  children,
}: {
  scale: LandingScale;
  tone?: 'ground' | 'well';
  style?: StyleProp<ViewStyle>;
  /**
   * Paint above the next band, so a child can sit on the lip between
   * the two. Later siblings win by default; this reverses it for the
   * band whose content deliberately leans over the edge.
   */
  raise?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[tone === 'well' ? styles.well : undefined, raise && styles.raise]}
    >
      <View
        style={[
          styles.measure,
          { paddingHorizontal: scale.inset, paddingVertical: scale.air },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const { isExpanded, width } = useBreakpoint();
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
   * One scale for the whole page, shared with every section on it.
   * Three sections each inventing their own clamp is how a page ends up
   * with four heading sizes and no hierarchy.
   */
  const scale = useMemo(() => landingScale(width), [width]);
  const { inset, air, figure, unit } = scale;
  /**
   * The footer draws its own full-width band, so it cannot sit inside
   * one. Padding it by the gutter plus whatever the column is inset
   * from the window puts its first letter under everything above it.
   */
  const footerPad =
    inset + Math.max(0, (Math.min(width, 1600) - LANDING_MEASURE) / 2);

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
        {/* Sized off the width, not the viewport height.
            `useWindowDimensions().height` is 0 through the static render
            and never emits again on its own, so a 94%-of-viewport hero
            resolved to its 560px floor at every size on the page as
            shipped — measured identical at 390x844 and 1440x900. Width
            is known (the whole desktop layout keys off it), and a poster
            hero pinned to a real number is steadier on iOS anyway, where
            a vh-shaped box grows by a toolbar's worth the moment
            anybody scrolls. */}
        <View style={[styles.masthead, isExpanded && styles.mastheadWide]}>
          <LandingWall columns={isExpanded ? 7 : 4} />
          {/* Heavy where the words are, open at the top right, so the
                pile is visible without ever competing with the line it
                exists to prove. */}
          <LinearGradient
            colors={[
              'rgba(39,47,63,0.50)',
              'rgba(39,47,63,0.78)',
              'rgba(39,47,63,0.96)',
              LANDING_GROUND,
            ]}
            locations={[0, 0.42, 0.78, 1]}
            start={{ x: 0.75, y: 0 }}
            end={{ x: 0.15, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* The page's first pixels, in exactly the colour iOS Safari
              paints its status bar — and then a long way down before it
              lets go of it.

              While the toolbar is expanded that strip belongs to the
              browser, not the document, so artwork cannot be drawn into
              it; a seam between two dark blues is only a seam because
              they are two. Landing the hero on the theme colour makes
              the bar read as the top of the picture rather than a slab
              above it.

              It sits AFTER the scrim, which is the whole trick. Behind
              it the top row measured rgb(47,56,75) against a status bar
              of rgb(39,47,63) — the scrim is an absolute fill and was
              laying its lightest corner straight over the one band that
              had to match exactly.

              Six stops rather than three. A flat band with one linear
              fade under it has a visible corner where the fade begins,
              and at sixty pixels tall the flat part was itself a slab.
              This is opaque for about fifteen pixels and then eases out
              over a hundred and thirty, which is a scrim rather than an
              edge. */}
          <LinearGradient
            colors={[
              LANDING_GROUND,
              LANDING_GROUND,
              'rgba(39,47,63,0.86)',
              'rgba(39,47,63,0.55)',
              'rgba(39,47,63,0.22)',
              'rgba(39,47,63,0)',
            ]}
            locations={[0, 0.1, 0.3, 0.52, 0.75, 1]}
            style={[
              styles.statusMatch,
              { height: safe.top + (isExpanded ? 110 : 150) },
            ]}
            pointerEvents="none"
          />
          {/* On the same column as every band below, so the headline
              and the section leads share a left edge. */}
          <View
            style={[
              styles.measure,
              styles.mastheadCopy,
              { paddingHorizontal: inset, paddingTop: safe.top + SPACING.xl },
            ]}
          >
            {/* No back chevron. Most people reach this page from a link
                  and have nowhere to go back to; the ones who came from
                  the footer have a browser button and the mark below. */}
            <Animated.View style={[styles.lockup, step(0, 0.35)]}>
              <MarkDraw size={40} />
              <Text style={styles.word}>SIDEQUEST</Text>
            </Animated.View>
            <Animated.Text
              style={[styles.headline, scale.display, step(0.08, 0.6)]}
            >
              Know what you can actually finish.
            </Animated.Text>
            <Animated.Text style={[styles.standfirst, step(0.2, 0.75)]}>
              Forty games waiting. Three you will finish. Sidequest works out
              which three.
            </Animated.Text>
            <Animated.View style={step(0.32, 0.9)}>{open}</Animated.View>
          </View>
        </View>

        {/* The arithmetic nobody does for themselves, set as the number
            it is. This is the whole case for the product, and it is
            more persuasive than any sentence about it. */}
        <WhenNear placeholder={<View style={styles.sumRoom} />}>
          <Band tone="well" scale={scale} style={scale.wide && styles.sumWide}>
            <QuestMark id="sum" />
            <Sum
              style={scale.wide ? styles.sumFigureWide : undefined}
              figure={figure}
              unit={unit}
            />
            <Rise from="right" delay={220} style={styles.sumTailSlot}>
              <Text style={[styles.sumTail, scale.body]}>
                and the average week has about six. Fifteen years of evenings.
              </Text>
            </Rise>
          </Band>
        </WhenNear>

        {/* The problem is stated above. This is the reader's own copy of
            it, answered — the app's real scheduler, on real games, in a
            band, before anybody has been asked for anything. It goes
            here rather than lower down because a page that argues for
            six sections and only then lets you touch something has the
            order backwards. */}
        <WhenNear placeholder={<View style={styles.tryRoom} />}>
          <Band scale={scale}>
            <QuestMark id="try" />
            <LandingTry scale={scale} />
          </Band>
        </WhenNear>

        {/* The problem is stated above; this is the answer, before any
            of the detail. Somebody deciding whether to bother needs to
            know what will be asked of them, and three numbered steps is
            the plainest way to say it. */}
        <Band scale={scale}>
          <QuestMark id="how" />
          <HowItWorks scale={scale} />
        </Band>

        {/* Volume, which none of the single objects below can show.
            The row runs off the right edge on purpose. */}
        <WhenNear placeholder={<View style={styles.shelfRoom} />}>
          {/* Not a Band: the copy sits in the measured column, but the
              marquee runs edge to edge. A horizontally moving row that
              stops at the column's edge is a window with a frame; one
              that runs under both edges of the screen is a world going
              past. */}
          <View style={styles.well}>
            <View
              style={[
                styles.measure,
                styles.pile,
                { paddingHorizontal: inset, paddingTop: air },
              ]}
            >
              <QuestMark id="pile" />
              <Words
                text="Bring the whole pile."
                style={[styles.lead, scale.lead]}
              />
              <Rise delay={90}>
                <Text style={[styles.pileBody, scale.body]}>
                  Paste a Steam profile and everything arrives, hours included.
                  Or hand it a CSV.
                </Text>
              </Rise>
            </View>
            <View style={{ paddingBottom: air, paddingTop: SPACING.lg }}>
              <LandingShelf
                games={(games ?? []).slice(0, scale.wide ? 6 : 5)}
                width={scale.wide ? 232 : 150}
              />
            </View>
          </View>
        </WhenNear>

        {/* All three beats in one band, divided by rules rather than by
            background. Three separate bands gave each claim its own
            slab of ground and its own sixty pixels of padding top and
            bottom, which is what made the middle of the page read as
            one long grey corridor. */}
        <Band scale={scale} style={styles.beats}>
          {BEATS.map((beat, index) => (
            <View
              key={beat.lead}
              style={[
                styles.beat,
                index > 0 && styles.beatRuled,
                scale.wide && styles.beatWide,
                // Every other one turned around. Three identical
                // two-column splits stacked is a table; alternating them
                // is what makes a reader's eye travel down a page.
                scale.wide && index % 2 === 1 && styles.beatFlipped,
              ]}
            >
              <QuestMark id={`beat-${index}`} />
              {/* The claim and its sentence, together. A lead belongs
                  with its own body; what belongs opposite is the
                  evidence. */}
              <View style={scale.wide ? styles.beatCopyWide : styles.beatCopy}>
                <View style={styles.beatHead}>
                  <Rise from={scale.wide && index % 2 === 1 ? 'right' : 'left'}>
                    <Text style={styles.beatIndex}>{`0${index + 1}`}</Text>
                  </Rise>
                  <Words
                    text={beat.lead}
                    style={[styles.lead, scale.leadColumn]}
                    delay={90}
                  />
                </View>
                <Rise delay={90}>
                  <Text style={[styles.beatBody, scale.body]}>{beat.body}</Text>
                </Rise>
              </View>
              {/* The app's own components, fed real data: a claim with
                  the thing itself beside it beats a claim with an icon
                  over it. */}
              {/* Pinned to the page's outer edge, not centred in its
                  half. A 320px object floating in the middle of a 500px
                  column has grey on both sides of it and looks like it
                  was dropped there; against the edge it looks placed. */}
              <View
                style={
                  scale.wide
                    ? [
                        styles.beatProofWide,
                        index % 2 === 1
                          ? styles.beatProofFlipped
                          : styles.beatProofOuter,
                      ]
                    : undefined
                }
              >
                {/* Lags the copy beside it for the whole time the row
                    is on screen, so a beat has depth rather than just an
                    arrival. */}
                <Drift
                  distance={scale.wide ? 30 : 14}
                  testID={`beat-proof-${index}`}
                >
                  <Rise from="lift" delay={200}>
                    <LandingProof
                      kind={beat.kind}
                      game={games?.[index + 2]}
                      width={scale.column}
                      hue={beat.hue}
                    />
                  </Rise>
                </Drift>
              </View>
            </View>
          ))}
        </Band>

        {/* The one showpiece, and the only thing on the page that
            arrives crooked and straightens. Used once: a second `tilt`
            further down would turn a signature into a mannerism. */}
        <WhenNear placeholder={<View style={styles.cardRoom} />}>
          <Band tone="well" scale={scale} style={styles.card} raise>
            <QuestMark id="memcard" />
            <Words
              text="And something to show for the year."
              style={[styles.lead, scale.lead]}
            />
            {/* Caption above the card so the card can be last, and so
                it can hang over the seam. */}
            <Rise delay={120}>
              <Text style={[styles.cardCaption, scale.body]}>
                Shares as one link. No account attached.
              </Text>
            </Rise>
            {/* The covers fly in from the reader's side and become the
                blocks — the product-film build, with the games as the
                pieces. At the full width of the column, because a
                showpiece drawn at a third of its stage is a thumbnail
                of itself.

                And hanging over the band's bottom edge, because the
                page's biggest object should not sit politely inside its
                box: an object crossing the seam is what tells a reader
                the sections are one page rather than a stack. */}
            <Drift distance={-22} testID="memcard-drift">
              <View style={styles.cardStage}>
                <MemcardBuild
                  card={sampleCard(games)}
                  games={games ?? []}
                  maxWidth={scale.wide ? 1000 : 640}
                />
              </View>
            </Drift>
          </Band>
        </WhenNear>

        {/* The long tail, ranked below everything argued above it. */}
        <Band scale={scale}>
          <QuestMark id="index" />
          <FeatureIndex scale={scale} />
        </Band>

        {/* Where to get it, given the ceremony a store launch gets —
            because "it is just a link" is this product's proudest fact
            and was being said in a footnote. */}
        <WhenNear placeholder={<View style={styles.takeRoom} />}>
          <Band tone="well" scale={scale} raise>
            <QuestMark id="take" />
            <LandingTake scale={scale} />
          </Band>
        </WhenNear>

        <Band scale={scale} style={scale.wide && styles.plainWide}>
          <View style={scale.wide ? styles.plainCopy : styles.plainStack}>
            <QuestMark id="close" />
            <Words
              text="No account. No tracking."
              style={[styles.lead, scale.lead]}
            />
            <Text style={[styles.plainBody, scale.body]}>
              Your library lives in your browser and goes nowhere. Nothing to
              sign up for, nothing to cancel, nobody selling what you play.
            </Text>
            <Text style={[styles.plainBody, scale.body]}>
              Independent and open source. Data from RAWG and IGDB.
            </Text>
          </View>
          <View style={[styles.closeCta, scale.wide && styles.closeCtaWide]}>
            {open}
          </View>
        </Band>

        {/* The trail ends at a place, not a line: the footer's ground
            rises as a hill and the Mark climbs up to stand on it. */}
        <Horizon onStart={() => router.push('/')} />

        {/* Padded to land on the same column the bands use, so the
            footer's first letter sits under everything above it. */}
        <SiteFooter pad={footerPad} />

        {/* Above the bands, under nothing: the gutter it lives in has
            no text to cover. */}
        <QuestLine measure={LANDING_MEASURE} />
      </ScrollView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: LANDING_GROUND },
  // Centred past the cap, or a 4K monitor gets the whole page pinned to
  // its left edge with half a screen of nothing beside it.
  // The scroller stays as wide as the app allows, so bands bleed to
  // both edges; the column lives inside them. See `Band`.
  scroll: { maxWidth: 1600, width: '100%', alignSelf: 'center' },

  // masthead
  masthead: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
    minHeight: 620,
  },
  mastheadWide: { minHeight: 760 },
  statusMatch: { position: 'absolute', top: 0, left: 0, right: 0 },
  mastheadCopy: { paddingBottom: SPACING.xl * 2 },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginBottom: SPACING.xl,
  },
  // The lockup is the page's first object; at nav size it read as
  // chrome that had wandered onto a poster.
  word: {
    ...TYPE.h1,
    fontSize: 26,
    letterSpacing: 2,
    color: COLORS.lightGrey,
  },
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
    fontSize: 24,
    lineHeight: 35,
    color: COLORS.lightGrey,
    maxWidth: 600,
    marginBottom: SPACING.xl + 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 18,
    paddingHorizontal: SPACING.xl + 6,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    /**
     * The hard-offset edge every arcade button has. A flat pill is a
     * link wearing a background; four pixels of darker amber under it
     * is a thing with a travel, which is what makes people want to
     * press it. RN 0.81 ships boxShadow cross-platform.
     */
    boxShadow: '0 4px 0 #B87A16',
  },
  ctaLabel: { ...TYPE.label, fontSize: 16, color: COLORS.navy },

  /**
   * Bands, not hairlines.
   *
   * Every section shared one background and was separated by a rule,
   * which reads as one long scroll with faint lines in it rather than
   * as a page with parts. Alternating the ground is what gives a
   * landing page its rhythm, and it works at both widths — where an
   * asymmetric column layout only works at one.
   */
  well: { backgroundColor: LANDING_WELL },
  raise: { zIndex: 2 },
  measure: {
    width: '100%',
    maxWidth: LANDING_MEASURE,
    alignSelf: 'center',
  },
  /**
   * Every claim on the page, at one size.
   *
   * They were all TYPE.title — 26px, the app's shelf-heading step. That
   * is the right size for a label above a row you are about to use and
   * far too small to hold a band of its own: measured at 1440, a 26px
   * lead capped at 460 sat in a row 1320 wide. The scale carries the
   * size now; this carries everything else about it.
   */
  lead: { color: COLORS.white, maxWidth: 900 },

  // the sum
  sumRoom: { height: 320 },
  sumWide: {
    flexDirection: 'row',
    // On the number's baseline side rather than its centre: a 196px
    // numeral centred against three lines of body copy leaves the copy
    // floating in the middle of a very tall row.
    alignItems: 'flex-end',
    gap: SPACING.xl * 2,
  },
  sumFigureWide: { flexShrink: 0 },
  sumTailSlot: { flex: 1 },
  sumLead: { ...TYPE.micro, color: COLORS.mediumGrey },
  sumLine: {
    flexDirection: 'row',
    // On the baseline, so the word sits on the numeral's feet rather
    // than floating in the middle of its height.
    alignItems: 'baseline',
    gap: SPACING.sm + 2,
    marginVertical: SPACING.sm,
  },
  sumFigure: { ...TYPE.numeral, color: COLORS.accent },
  // Grey, not amber. Two amber weights in one line is two things
  // shouting; the number is the thing worth shouting.
  sumUnit: { ...TYPE.title, color: COLORS.lightGrey },
  sumTail: { color: COLORS.lightGrey, maxWidth: 520, paddingBottom: 6 },

  // the three beats
  beats: { gap: 0 },
  beat: { paddingVertical: SPACING.xl * 1.4, gap: SPACING.lg },
  // A hairline between claims instead of a change of ground. Three
  // bands for three sentences is what turned the middle of the page
  // into a corridor.
  beatRuled: { borderTopWidth: 1, borderTopColor: COLORS.stroke },
  beatWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 2,
  },
  beatFlipped: { flexDirection: 'row-reverse' },
  beatCopy: { gap: SPACING.md },
  beatCopyWide: { flex: 1, gap: SPACING.lg, justifyContent: 'center' },
  beatHead: { gap: SPACING.sm },
  // A marker in the margin above the line, not a number in a circle.
  // Three beats need to read as an ordered argument; this is the
  // cheapest way to say so without a device.
  beatIndex: { ...TYPE.tag },
  beatBody: { maxWidth: 520 },
  beatProofWide: { flex: 1, justifyContent: 'center' },
  beatProofOuter: { alignItems: 'flex-end' },
  beatProofFlipped: { alignItems: 'flex-start' },

  // the pile
  shelfRoom: { height: 420 },
  tryRoom: { height: 620 },
  takeRoom: { height: 560 },
  pile: { gap: SPACING.lg },
  pileBody: { maxWidth: 620, marginBottom: SPACING.md },

  // the card
  cardRoom: { height: 460 },
  card: { alignItems: 'center', gap: SPACING.xl },
  // The showpiece hangs a third of itself past the band's bottom edge.
  cardStage: { marginBottom: -110, zIndex: 1 },
  cardCaption: { textAlign: 'center' },

  // the plain truth
  plainWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.xl * 2,
  },
  plainStack: { gap: SPACING.md },
  plainCopy: { flex: 1, gap: SPACING.md },
  closeCtaWide: { marginTop: 0, flexShrink: 0 },
  plainBody: { maxWidth: 560 },
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
