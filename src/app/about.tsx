import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Animated,
  Platform,
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
import { LandingCalendar } from '@/components/LandingCalendar';
import { LandingWatch } from '@/components/LandingWatch';
import { MemcardBuild } from '@/components/MemcardBuild';
import { MemcardPanel } from '@/components/MemcardPanel';
import { QuestLine, QuestMark } from '@/components/QuestLine';
import { BeatDeck, BeatWash } from '@/components/BeatDeck';
import { Seam, type SeamVariant } from '@/components/Seam';
import { Rise, useInView } from '@/components/Rise';
import { ScrollStage, useStagePins } from '@/components/ScrollStage';
import { Words } from '@/components/Words';
import { LandingWall } from '@/components/LandingWall';
import { MarkDraw } from '@/components/MarkDraw';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { ArcadeButton } from '@/components/ArcadeButton';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { WhenNear } from '@/components/WhenNear';
import { queryKeys } from '@/api/queryClient';
import { getTrendingGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { PILE_HOURS, PILE_VERDICT } from '@/lib/pile';
import { webScrollContainerStyle } from '@/lib/webScrollContainer';
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
import { SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE, WORDMARK } from '@/styles/typography';

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

/**
 * The shortest viewport the memcard's `ScrollStage` will pin itself
 * for — see `ScrollStage`'s own `minViewport` doc comment for why.
 * Named and shared rather than inlined at each call site: the
 * `WhenNear` placeholder below needs the SAME number the `ScrollStage`
 * gets, via the same `useStagePins` hook, or the placeholder can size
 * itself for a pin the stage isn't actually going to do.
 */
const MEMCARD_MIN_VIEWPORT = 720;

/**
 * The beat deck's own floor, lower than the memcard's. A panel is a
 * column of text and one proof card rather than a fixed-aspect object,
 * so it stays legible in a much shorter window — and the deck has a
 * working swipeable fallback below this, which the memcard does not.
 */
const DECK_MIN_VIEWPORT = 560;

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
function Sum({ figure, unit }: { figure: TextStyle; unit: TextStyle }) {
  const [ref, seen] = useInView('-30%');
  const hours = useCountUp(PILE_HOURS, 0, seen);

  return (
    <View ref={ref}>
      {/* "Backlog" is the one word on this page a non-player would
          stumble on, and it was sitting over the biggest number. */}
      <Text style={styles.sumLead}>An average pile of unplayed games</Text>
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
  air,
  raise = false,
  seam,
  seamVariant = 'lip',
  children,
}: {
  scale: LandingScale;
  tone?: 'ground' | 'well';
  style?: StyleProp<ViewStyle>;
  /**
   * Room above and below, overriding the page's own `scale.air`.
   *
   * A prop rather than a `style` override, and that is not fussiness.
   * The band applies its air as an INLINE object; react-native-web
   * turns registered `StyleSheet` entries into classes and leaves
   * inline objects inline, and inline wins on specificity whatever the
   * array order says. A `styles.tighter` passed as `style` therefore
   * looks correct at the call site, reads correct in the array, and
   * does nothing — measured as 64 points of padding on a band that had
   * asked for 20. Taking the number as a prop puts it in the same
   * inline object as the default, where last-write-wins is the rule
   * that actually applies.
   */
  air?: number;
  /**
   * Paint above the next band, so a child can sit on the lip between
   * the two. Later siblings win by default; this reverses it for the
   * band whose content deliberately leans over the edge.
   */
  raise?: boolean;
  /**
   * Which seam down the page this band's leading edge is. Given, the
   * band arrives on a drawn memory-card edge instead of a flat colour
   * change; the number alternates which corner is chamfered.
   */
  seam?: number;
  /**
   * How loud this seam is.
   *
   * Default is the quiet lit lip. `card` is a chapter break and
   * belongs only where the page changes subject; `glyphs` is used
   * exactly once.
   */
  seamVariant?: SeamVariant;
  children: React.ReactNode;
}) {
  /**
   * The seam sits ABOVE the band's own paint, not inside it.
   *
   * When it lived inside the well View, the well's background filled
   * the whole seam box — including the chamfer's cut corner — so the
   * card edge degraded to two floating hairlines over a uniform well.
   * Out here the seam's face is the only well at that height: the cut
   * corner is genuinely cut, and through it you see the page's grained
   * ground, which is what "behind the card" actually looks like on
   * this page. Ground bands paint no face at all — they are
   * transparent themselves, so their seams are just the line.
   */
  return (
    <View style={raise && styles.raise}>
      {seam != null && (
        <Seam
          color={tone === 'well' ? LANDING_WELL : 'transparent'}
          index={seam}
          variant={seamVariant}
        />
      )}
      <View style={tone === 'well' ? styles.well : undefined}>
        <View
          style={[
            styles.measure,
            {
              paddingHorizontal: scale.inset,
              paddingVertical: air ?? scale.air,
            },
            style,
          ]}
        >
          {children}
        </View>
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
  // The memcard's own pin decision, hoisted up here so the `WhenNear`
  // placeholder below can size itself off the SAME answer `ScrollStage`
  // computes internally, rather than a second, hand-written condition
  // that could disagree with it (reduced motion is only one of two
  // reasons `ScrollStage` might not pin — a too-short viewport is the
  // other, and a placeholder that only checked `reduced` would still be
  // wrong on that path).
  const memcardPinned = useStagePins(MEMCARD_MIN_VIEWPORT);

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

  /**
   * The cabinet's own word, and only that.
   *
   * Two labels came before it. "Open Sidequest" named the app and the
   * act of opening it, which is the one thing a stranger already knows
   * they can do with a link. "Find what I can finish" replaced it to
   * make the promise instead of the mechanism — and made it a second
   * time, because the headline eight lines up is "Know which games you
   * can actually finish". The same claim twice in one hero, with the
   * pronoun flipping from you to I between them, and five words spent
   * on a button whose reader had just read all five.
   *
   * A cabinet does not explain itself on the cap. It says START, which
   * is the word this component is already built around — the attract
   * lamp in `ArcadeButton` exists because a real machine pulses its
   * START lamp at nobody in particular. Nothing here repeats the
   * headline, and the hero's argument is left to the lines that are
   * shaped to carry it.
   *
   * No sublabel either. It carried "20 seconds · no account" while the
   * line below carried "Free · Nothing to install" — four reassurances
   * in a hundred and fifty points, which is a hero negotiating rather
   * than a hero stating. The claims live on one line under the button
   * now, and the button is one object.
   */
  const open = (
    <ArcadeButton
      label="PRESS START"
      accessibilityLabel="Press start — open Sidequest"
      onPress={() => router.push('/')}
    />
  );

  return (
    <Textured style={styles.background}>
      <PageTitle>About Sidequest</PageTitle>
      {/* No safe-area view around this. Reserving the top inset put a
          band of flat page colour above the hero and stopped the
          artwork reaching the top of the screen; the copy clears the
          status bar on its own instead. */}
      <ScrollView
        testID="about-scroll"
        style={SCROLL_CONTAINER}
        contentContainerStyle={styles.scroll}
      >
        {/* Sized off the width, not the viewport height.
            `useWindowDimensions().height` is 0 through the static render
            and never emits again on its own, so a 94%-of-viewport hero
            resolved to its 560px floor at every size on the page as
            shipped — measured identical at 390x844 and 1440x900. Width
            is known (the whole desktop layout keys off it), and a poster
            hero pinned to a real number is steadier on iOS anyway, where
            a vh-shaped box grows by a toolbar's worth the moment
            anybody scrolls. */}
        {/* The hero and the statistic are ONE surface.
            Not two sections that meet politely — one region, with one
            wall, one scrim over it and one fade that closes it. That is
            the whole design, and it took three wrong versions to arrive
            at, each of which drew a line across the page in a different
            way. The wall lived inside the masthead first, clipped to
            it, so the artwork stopped dead on a horizontal edge. Moving
            it out without moving the scrim left the wall below the hero
            with nothing over it, and the artwork under the hero came
            out BRIGHTER than the artwork in it. Adding a second scrim
            below to fix that put the two gradients edge to edge, and
            two gradients that meet always show where.
            Every layer here therefore spans the ENTIRE region and is
            positioned in fractions of it. There is no join to see
            because there is nowhere for one to be. */}
        <View style={styles.heroRegion}>
          {/* Rows alongside columns, because the two are one fact about
              this breakpoint: seven narrow lanes need seven covers each
              to reach the bottom of a 760pt hero, four wide ones on a
              phone need nine to cross 620pt at their smaller pitch.
              Both overfill deliberately — `wall` crops, and the covers
              are thumbnails.

              More of both since the region grew past the masthead. The
              lanes centre their covers and stretch to the wall's full
              height, so a wall taller than its own content does not
              spread the heap out — it opens a gap of bare ground at
              each end, which on this page is the hard edge again with
              extra steps. The overfill has to survive the taller box. */}
          <LandingWall
            columns={isExpanded ? 7 : 4}
            rows={isExpanded ? 10 : 13}
          />
          {/* Heavy where the words are, open at the top right, so the
              pile is visible without ever competing with the line it
              exists to prove.
              Across the whole region rather than the masthead, and it
              never closes completely — the diagonal cannot be what
              shuts the artwork off, because a diagonal reaches the
              bottom of its box at one corner and leaves the other
              corner open. Closing is the next layer's job. The stops
              moved earlier to compensate for the taller box: the
              headline sits at the same points on the page but a
              smaller fraction of the way down it, so a scrim tuned for
              a 620pt hero would arrive under the copy far too light. */}
          <LinearGradient
            colors={[
              'rgba(39,47,63,0.20)',
              'rgba(39,47,63,0.60)',
              'rgba(39,47,63,0.90)',
              'rgba(39,47,63,0.94)',
            ]}
            locations={[0, 0.32, 0.6, 1]}
            start={{ x: 0.75, y: 0 }}
            end={{ x: 0.15, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* And the layer that closes it, straight down.
              Held at nothing through the hero so the artwork there is
              the diagonal's business alone, then ramping to the page's
              own ground and reaching it before the region ends. Every
              stop is a fraction of the region, so the fade cannot come
              adrift of the box the way a fixed height did — and because
              it finishes above the region's foot, the last stretch is
              already exactly the page below it. */}
          <LinearGradient
            colors={[
              'rgba(39,47,63,0)',
              'rgba(39,47,63,0)',
              'rgba(39,47,63,0.55)',
              LANDING_GROUND,
            ]}
            locations={[0, 0.46, 0.72, 0.93]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* The page's own surface, over all of it.
              The grain is painted BEHIND everything by the wrapper
              around the document, so any opaque stop above covers it —
              and the region's foot came out flat navy meeting grained
              navy, which is a seam made of texture rather than tone and
              reads exactly as hard. Laid over the whole region instead
              of over the faded part, because a grain that starts
              somewhere is one more edge to find. The hero's artwork
              picks it up too, which is correct: the rest of the page is
              this surface, and the hero was the one stretch pretending
              otherwise. */}
          <Textured fill />
          <View style={[styles.masthead, isExpanded && styles.mastheadWide]}>
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
                <Text style={styles.word}>sidequest</Text>
              </Animated.View>
              {/* Say WHICH games, not "what".
                "Know what you can actually finish" is a fine line and an
                ambiguous one: finish what — books, jobs, the washing? A
                stranger who has never heard of this should not have to
                infer the category from the artwork behind the words. */}
              <Animated.Text
                style={[styles.headline, scale.display, step(0.08, 0.6)]}
              >
                Know which games you can actually finish.
              </Animated.Text>
              {/* Two short sentences: what you give it, what it knows.
                The outcome is already in the headline, so saying it
                again here cost twenty-seven words to repeat a claim the
                reader had just read. What it could not skip is the
                input — time you actually have — because that is the
                promise the rest of the page has to keep. */}
              <Animated.Text style={[styles.standfirst, step(0.2, 0.75)]}>
                Tell it how much time you get. It knows how long games take.
              </Animated.Text>
              <Animated.View style={step(0.32, 0.9)}>{open}</Animated.View>
              {/* The objections a stranger has, answered before they are
                asked, and all in one place.
                "No account" was moved out of here once, when the button
                carried it in a line of its own — a claim made twice
                within forty pixels reads as a page insisting rather than
                a page stating. The button says nothing but its own name
                now, so the claim comes back rather than disappearing
                from the hero: no account is the promise the calendar
                hand-off and the Twitch lookup are both shaped around,
                and it is not a detail this page can afford to drop. */}
              <Animated.Text style={[styles.terms, step(0.4, 1)]}>
                Free · No account · Nothing to install
              </Animated.Text>
            </View>
          </View>

          {/* The arithmetic nobody does for themselves, set as the number
              it is. This is the whole case for the product, and it is
              more persuasive than any sentence about it. */}
          <WhenNear placeholder={<View style={styles.sumRoom} />}>
            {/* No seam, above or below.
              A seam is the edge between two grounds, and there is no
              longer an edge here: the statistic used to be a well
              stripe, so the page needed a line to say where the paint
              changed. It is a card on the page's own ground now, and a
              hairline over continuous ground is a rule drawn around
              nothing — it cut the card off from the hero it belongs to
              and from the question underneath that answers it. The
              band below drops its seam for the same reason, so the
              three read as one stretch of page with an object sitting
              on it. */}
            <Band scale={scale} air={SPACING.md}>
              <QuestMark id="sum" />
              {/* A memory card, not a stripe.
                The statistic used to be a full-bleed well — a change of
                ground, which is the page's quietest device and the one
                it uses seven other times. This is the reader's own pile
                stated as a number, and it lands harder as an object
                than as a paint change: the memory-card silhouette is
                the app's own hardware, and a save is exactly what nine
                hundred unplayed hours is. The band keeps the page's
                ground behind it so the card reads as sitting ON the
                page rather than as another band of it, and the seam
                above drops to a plain lip, because a chapter edge and a
                card in the same two hundred points was the silhouette
                twice.

                One stack inside it, at every width. The wide layout set
                the figure left and its explanation in a second column —
                measured at 1100pt, 130 points of empty band between a
                number and the only text that says what it is. A reader
                scrolling past saw a very large 900 with nothing
                attached to it, which is what the band is for and what
                it failed at. */}
              <MemcardPanel
                style={styles.sumCard}
                contentStyle={styles.sumInner}
              >
                <Sum figure={figure} unit={unit} />
                <Rise from="below" delay={220}>
                  {/* The argument, at the size an argument gets.
                    This was two lines of grey body copy: "The average
                    week has about six" — six of what, arriving after a
                    number labelled hours — and a conclusion that did
                    not follow from it. One sentence carries both
                    operands and the result now, so the number explains
                    itself where it is read, and it is set at the page's
                    column size rather than at body: the figure is the
                    evidence and this is the verdict, and a verdict in
                    grey at seventeen points under a numeral at two
                    hundred is not a hierarchy, it is a footnote. */}
                  <Text style={[styles.sumVerdict, scale.leadColumn]}>
                    {PILE_VERDICT}
                  </Text>
                </Rise>
              </MemcardPanel>
            </Band>
          </WhenNear>
        </View>

        {/* The problem is stated above. This is the reader's own copy of
            it, answered — the app's real scheduler, on real games, in a
            band, before anybody has been asked for anything. It goes
            here rather than lower down because a page that argues for
            six sections and only then lets you touch something has the
            order backwards. */}
        <WhenNear placeholder={<View style={styles.tryRoom} />}>
          {/* Tight to the card above it, not a band's worth of air.
              The full `scale.air` belongs above a band that announces
              itself with a change of ground; this one follows a card on
              the same surface, and the question it asks is the direct
              answer to the number on that card. A screenful of nothing
              between the two makes the reader cross a gap to reach a
              reply. */}
          <Band scale={scale} air={SPACING.lg}>
            <QuestMark id="try" />
            <LandingTry scale={scale} />
          </Band>
        </WhenNear>

        {/* Directly after the plan, because that is where the reader
            asks "and then what?".
            Every section above this one argues inside the app, and all
            of it dies when the tab closes — the page's own case for the
            product is about somebody's Tuesday, and until here it never
            reaches one. This is also the only place the privacy promise
            is load-bearing rather than decorative: the feature is a file
            BECAUSE an integration would need OAuth, a server, and an
            account. */}
        <WhenNear placeholder={<View style={styles.calendarRoom} />}>
          {/* Ground, no seam, and close air — the statistic's treatment
              exactly, because it is now the same kind of thing.
              The well had to go first: the panel's shell and the well
              are a point apart on the same navy — #1D2431 against
              #1E2532 — so a card drawn on a well is a card nobody can
              see. And with the ground continuous either side of it,
              the seams have nothing left to mark. A seam is the edge
              between two grounds; drawn over one unbroken ground it is
              a rule around nothing, and it boxed the card into a
              section instead of letting it lie on the page. The line
              below it belonged to the watch band, which drops its own
              for the same reason. */}
          <Band scale={scale} air={SPACING.lg}>
            <QuestMark id="calendar" />
            <LandingCalendar scale={scale} games={games} />
          </Band>
        </WhenNear>

        {/* Straight after the calendar, because they are the same idea
            twice: the app reaching past itself without asking anyone to
            log into anything. The plan leaves for your week; this
            answers the last doubt the plan cannot — whether you'll
            actually like it. */}
        <WhenNear placeholder={<View style={styles.watchRoom} />}>
          <Band scale={scale}>
            <QuestMark id="streams" />
            <LandingWatch scale={scale} games={games} />
          </Band>
        </WhenNear>

        {/* The problem is stated above; this is the answer, before any
            of the detail. Somebody deciding whether to bother needs to
            know what will be asked of them, and three numbered steps is
            the plainest way to say it. */}
        <Band scale={scale} seam={0}>
          <QuestMark id="how" />
          <HowItWorks scale={scale} />
        </Band>

        {/* Volume, which none of the single objects below can show.
            The row runs off the right edge on purpose. */}
        {/* Raised like the memcard band, and for the same reason: the
            gutter trail is drawn over the page, and this band's wavy
            seam stands game pieces in the gutter. The trail passes
            behind the whole band — the same reading it already has at
            the memcard — instead of slicing through a controller. */}
        <WhenNear
          placeholder={<View style={styles.shelfRoom} />}
          style={styles.raise}
        >
          {/* Not a Band: the copy sits in the measured column, but the
              marquee runs edge to edge. A horizontally moving row that
              stops at the column's edge is a window with a frame; one
              that runs under both edges of the screen is a world going
              past. */}
          {/* The one decorated seam on the page. It belongs to the
              band about bringing your whole pile in, so the pile's
              own furniture — a pad, a disc, a cartridge, a life — is
              what the edge is cut out of. It works because the three
              seams above it were plain.

              ABOVE the well's paint, not inside it — the same hoist
              Band does, and for the same reason. Nested, the well
              filled a straight-edged rectangle from the seam's top
              and the wavy face painted its own colour onto it: the
              boundary between the two grounds went hard and flat,
              and the lit line was left floating in the dark below,
              attached to nothing. Out here the wave IS the edge. */}
          <Seam color={LANDING_WELL} index={1} variant="glyphs" />
          <View style={styles.well}>
            <View
              style={[
                styles.measure,
                styles.pile,
                /* Half the band's usual air. The wavy seam above is 68
                   points of drawn transition with the pile riding it —
                   it already IS the section's opening breath, and the
                   full step on top of it left the heading floating in
                   a hole twice the size of the one above the seam. */
                { paddingHorizontal: inset, paddingTop: Math.round(air * 0.5) },
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

        {/* The three beats, as a swipeable deck of coloured panels —
            one idea per card, the next peeking in from the edge, the
            same live evidence the old rows carried. The section keeps
            the ordinary lip seam: the panels are the event. */}
        {/* No background of its own: the page's grained ground runs
            straight through, and the seam's face is the only paint.
            An explicit navy here was the flat-patch bug again — right
            colour, wrong surface, visible as a strip under the deck. */}
        <View style={styles.deckGround}>
          {/* The ground is opaque so the quest trail cannot show through
              it, and opaque meant FLAT: the page's grain is painted by
              the `Textured` wrapper around the whole document, and a
              solid rectangle laid over it erased the texture for this
              one section. The section carries its own copy of the grain
              instead, so it reads as the same surface as the rest of the
              page rather than as a smooth panel dropped onto it. */}
          <Textured fill />
          <Seam color="transparent" index={2} />
          {/* Pinned, so the three beats are walked by the reader's own
              scroll rather than swiped past. Two-and-a-bit screens: one
              per beat plus a little, which is the shortest track that
              still lets each panel arrive, be read, and leave.

              The deck keeps working untouched when this does not pin —
              on native, under reduced motion, and on viewports too short
              to hold a panel — because `ScrollStage` hands `undefined`
              through and `BeatDeck` falls back to its swipeable rail. */}
          {/* The beat's colour washes the whole section, handed to the
              stage rather than rendered inside the deck: inside, it sat
              under the stage's vertical clip and could only paint the
              pinned window — so the tint began below this seam on the
              way in, and stopped short of the next one once pinned. */}
          <ScrollStage
            track={2.4}
            minViewport={DECK_MIN_VIEWPORT}
            background={(progress) => <BeatWash progress={progress} />}
          >
            {(progress, seek) => (
              <View style={styles.deckBody}>
                <BeatDeck
                  scale={scale}
                  games={games}
                  progress={progress}
                  onSeek={seek}
                />
              </View>
            )}
          </ScrollStage>
        </View>

        {/* The one showpiece, and the only thing on the page that
            arrives crooked and straightens. Used once: a second `tilt`
            further down would turn a signature into a mannerism. */}
        <WhenNear
          placeholder={
            <View
              style={memcardPinned ? styles.cardRoom : styles.cardRoomFlat}
            />
          }
          style={styles.raise}
        >
          <Band
            tone="well"
            scale={scale}
            style={styles.card}
            raise
            seam={3}
            seamVariant="card"
          >
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

                No longer hanging over the band's bottom edge — that
                belonged to the old unpinned layout's negative margin.
                ScrollStage now clips its stage vertically and centres
                the card inside it (see `cardStage`'s own comment), so
                nothing crosses the seam any more. */}
            <ScrollStage track={2.6} minViewport={MEMCARD_MIN_VIEWPORT}>
              {(progress) => (
                <View style={styles.cardStage}>
                  <MemcardBuild
                    card={sampleCard(games)}
                    games={games ?? []}
                    maxWidth={scale.wide ? 1000 : 640}
                    progress={progress}
                  />
                </View>
              )}
            </ScrollStage>
          </Band>
        </WhenNear>

        {/* The long tail, ranked below everything argued above it. */}
        <Band scale={scale} seam={4}>
          <QuestMark id="index" />
          <FeatureIndex scale={scale} />
        </Band>

        {/* Where to get it, given the ceremony a store launch gets —
            because "it is just a link" is this product's proudest fact
            and was being said in a footnote. */}
        <WhenNear
          placeholder={<View style={styles.takeRoom} />}
          style={styles.raise}
        >
          <Band tone="well" scale={scale} raise seam={5} seamVariant="card">
            <QuestMark id="take" />
            <LandingTake scale={scale} />
          </Band>
        </WhenNear>

        <Band
          scale={scale}
          seam={6}
          style={[
            // The phone above deliberately hangs over this band's
            // seam; the headline needs to start below its overhang,
            // not under its home indicator.
            styles.plainRoom,
            scale.wide && styles.plainWide,
          ]}
        >
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
        <SiteFooter pad={footerPad} mascot={false} shore={false} />

        {/* Above the bands, under nothing: the gutter it lives in has
            no text to cover. */}
        <QuestLine measure={LANDING_MEASURE} />
      </ScrollView>
    </Textured>
  );
}

/**
 * Without this, the memcard's `ScrollStage` never pins on web: the
 * `overflow-x: hidden` react-native-web puts on every vertical
 * `ScrollView` by default (not a rule this page added — see
 * `webScrollContainerStyle`'s doc comment) makes the ScrollView below a
 * second scroll container, which steals every descendant's `position:
 * sticky` out from under it. Because the rule is react-native-web's
 * default rather than something specific to this page, the underlying
 * sticky trap is app-wide by construction: any other screen with a
 * pinned section inside a vertical `ScrollView` on web needs the same
 * fix, not just this one.
 */
const SCROLL_CONTAINER = webScrollContainerStyle(Platform.OS);

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: LANDING_GROUND },
  // Centred past the cap, or a 4K monitor gets the whole page pinned to
  // its left edge with half a screen of nothing beside it.
  // The scroller stays as wide as the app allows, so bands bleed to
  // both edges; the column lives inside them. See `Band`.
  scroll: { maxWidth: 1600, width: '100%', alignSelf: 'center' },

  // masthead
  /**
   * The hero and the statistic under it, over one background.
   *
   * The clip lives here now rather than on the masthead: the wall is a
   * region-wide object, and clipping it at the masthead's foot is
   * exactly the hard horizontal edge this exists to remove.
   */
  heroRegion: { overflow: 'hidden' },
  masthead: {
    justifyContent: 'flex-end',
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
  word: { ...WORDMARK, fontSize: 26, lineHeight: 31 },
  headline: {
    fontFamily: 'Geom-ExtraBold',
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
  // The CTA's own look moved into ArcadeButton, where the hard amber
  // edge is a real object the cap presses into rather than a shadow.
  terms: {
    ...TYPE.micro,
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.mediumGrey,
    marginTop: SPACING.lg,
  },

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
  // A number this size needs a room, not a strip.
  /**
   * The phone stack, spaced as one thought: eyebrow, figure, verdict,
   * with the band's own air only above and below the group. The gap
   * between figure and tail was the full large step, which cut the
   * sentence in half — the number and its meaning read as two
   * exhibits.
   */
  /**
   * Its own air, far tighter than the page's.
   *
   * Every other band pays `scale.air` — 64 points on a phone, 110 on a
   * monitor — because a band is a change of ground and needs room
   * either side of the line that announces it. This one has no line and
   * no change of ground: it is a card lying on the same page as the
   * hero above it and the question below. At full air it read as an
   * isolated section with a card marooned in the middle of it, which is
   * the opposite of what the card was for — the pile and the question
   * that answers it belong in the same breath.
   */
  /**
   * Its own air, far tighter than the page's.
   *
   * Every other band pays `scale.air` — 64 points on a phone, 110 on a
   * monitor — because a band is a change of ground and needs room
   * either side of the line that announces it. This one has no line and
   * no change of ground: it is a card lying on the hero's own
   * background. At full air it read as an isolated section with a card
   * marooned in the middle of it, which is the opposite of what the
   * card is for — the pile and the hero that names it belong in the
   * same breath.
   */
  /**
   * Capped short of the full measure. A memory card is a hand-sized
   * object, and one stretched to a 1180pt column stops being a card and
   * becomes a stripe with a nick in its corner — which is the thing
   * this replaced.
   */
  sumCard: { maxWidth: 760, alignSelf: 'flex-start' },
  /**
   * Generous, because the notch eats the top right and the grooves sit
   * in the first ten points: content that starts where an ordinary
   * card's would runs straight into the cut.
   */
  sumInner: {
    paddingTop: SPACING.xl + 6,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
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
  /**
   * A short measure on purpose. At the full band width this sets as one
   * very long line on a monitor, and a verdict that spans a window
   * reads as a caption; broken over two or three, it reads as a
   * sentence somebody means.
   */
  sumVerdict: { maxWidth: 620, paddingBottom: 6 },

  plainRoom: { paddingTop: SPACING.xl * 2.5 },
  calendarRoom: { height: 620 },
  watchRoom: { height: 560 },
  deckBody: { paddingTop: SPACING.lg, paddingBottom: SPACING.xl * 1.5 },
  /**
   * The deck's own opaque ground, painted above the quest trail.
   *
   * The trail is drawn over the whole page from the Y positions of the
   * section marks. Removing this section's mark stopped it having a
   * waypoint here, but the line still RAN THROUGH the section on its way
   * from "how" to the pile — an amber thread crossing a stage that holds
   * still while the page scrolls past it. There is nothing to hide it
   * behind, because the page's ground is the page's, so the stage paints
   * its own copy of that exact colour and sits above the overlay.
   */
  deckGround: { backgroundColor: LANDING_GROUND, zIndex: 3 },

  // the three beats
  // A hairline between claims instead of a change of ground. Three
  // bands for three sentences is what turned the middle of the page
  // into a corridor.
  // A marker in the margin above the line, not a number in a circle.
  // Three beats need to read as an ordered argument; this is the
  // cheapest way to say so without a device.

  // the pile
  shelfRoom: { height: 420 },
  tryRoom: { height: 620 },
  takeRoom: { height: 560 },
  pile: { gap: SPACING.lg },
  pileBody: { maxWidth: 620, marginBottom: SPACING.md },

  // the card
  // Matches ScrollStage's own track={2.6} for the band this wraps: the
  // placeholder has to reserve the same room the pinned track will
  // occupy, or the page jumps by the difference the moment WhenNear
  // swaps the placeholder for the real section (a CLS regression the
  // 460px flat number left on the table once the card's motion moved
  // into a 2.6-viewport-tall scroll track).
  cardRoom: { height: '260dvh' as unknown as number },
  // Picked, via `memcardPinned` (== `useStagePins(MEMCARD_MIN_VIEWPORT)`,
  // the exact hook `ScrollStage` uses internally to decide the same
  // thing), whenever the stage is NOT going to pin — reduced motion, or
  // a viewport shorter than `MEMCARD_MIN_VIEWPORT`, are both live reasons
  // that can happen, and this style has to cover both rather than only
  // the first. An unpinned stage renders a plain, roughly-one-screen
  // View, so a placeholder reserving 260dvh for it inflates the document
  // by about two extra viewports until WhenNear swaps it, which throws
  // off scrollbar position, End-key navigation and anchor links until
  // the swap yanks them back. A flat number close to the real unpinned
  // height avoids that.
  cardRoomFlat: { height: 900 },
  card: { alignItems: 'center', gap: SPACING.xl },
  // Stacks the card above the fliers passing behind it. (No longer a
  // negative marginBottom to hang the card over a band's seam — that
  // seam belonged to the old unpinned layout. ScrollStage now centres
  // the card in its own 100dvh stage, and a negative margin there just
  // shrank the box flex centring measures against, pushing the card
  // below true centre by half of it — measured live as 183px above vs
  // 73px below at 95% scroll, exactly 110px / 2 off.)
  cardStage: { zIndex: 1 },
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
