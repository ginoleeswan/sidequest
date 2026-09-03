import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { Image } from 'expo-image';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { StageTrailer } from './StageTrailer';
import { gameQuery, seedGame } from '@/api/gameDetail';
import { artQuery } from '@/api/art';
import { TitleLogo } from './TitleLogo';
import { getMovies, mediaUri } from '@/api/rawg';
import type { Game, Movie } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PARALLAX_RATE, useStageParallax } from '@/hooks/useStageParallax';
import { pickTrailer, type StageSlide } from '@/lib/stage';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * The top of the home page: one full-bleed picture with an argument on
 * it.
 *
 * The rail this replaced showed five covers, a star and a year. It was
 * the first thing anyone saw and it said nothing — every visitor got the
 * same five games, and none of them explained why they were there. A
 * stage slide leads with the reason and treats the artwork as the
 * backdrop it is.
 *
 * Deliberately edge to edge and taller than a card: the page needs one
 * moment that isn't a row of tiles, and a hero hemmed in by the page
 * margin is just a wide tile.
 */

interface Props {
  slides: StageSlide[];
  /** Everything loaded, for the one action that wants a random pick. */
  games: Game[];
  /** Height of the floating header, so the copy clears it. */
  headerHeight: number;
  height: number;
  /** The page's own margin, so the headline lines up with the shelves. */
  inset?: number;
}

export function HomeStage({
  slides,
  games,
  headerHeight,
  height,
  inset = SPACING.md,
}: Props) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  /**
   * A paging list laid out at zero width stacks every slide at offset 0
   * and the last one wins — the stage opened on its second slide. The
   * window is the right first guess (exact on a phone, a frame early on
   * a desktop where the sidebar takes a bite), and the measurement
   * corrects it.
   */
  const width = measured || windowWidth;
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<StageSlide>>(null);

  /**
   * Where the swipe is, between pages.
   *
   * The copy is mounted once above the list and re-keyed on the slide,
   * so at the halfway point of a drag the outgoing words vanished and
   * the incoming ones appeared - a cut, in the middle of a gesture the
   * artwork was still smoothly following. This carries the scroll
   * offset so the block can dissolve across the join instead.
   */
  const scrollX = useAnimatedValue(0);

  /**
   * The dwell: linger on a slide and its still comes to life.
   *
   * Three seconds, so a flick past a slide never starts a download
   * for it, and reset on every page change so only the slide being
   * looked at ever plays. Desktop only: a phone's stage is a data
   * budget, and its stills are the design. Reduced motion means the
   * artwork stays a picture.
   */
  const { isCompact } = useBreakpoint();
  const reduced = useReducedMotion();
  // Which slide has been dwelt on, rather than a flag that has to be
  // reset: a new page simply is not the dwelt one until its own timer
  // fires, so nothing is written synchronously on the way in.
  const [dweltFor, setDweltFor] = useState<number | null>(null);
  const wantsTrailer = !isCompact && !reduced && slides.length > 0;
  const currentGame = slides[Math.min(index, slides.length - 1)]?.game;
  useEffect(() => {
    if (!wantsTrailer) return;
    const timer = setTimeout(() => setDweltFor(index), 3000);
    return () => clearTimeout(timer);
  }, [wantsTrailer, index]);
  const dwelt = dweltFor === index;

  /**
   * The slide on show is the likeliest tap on the page, so its record
   * is fetched while the reader is still looking at the picture: one
   * cached call per slide, against a page that opens with no wait. The
   * record only — the trailers and screenshots wait for the page, so a
   * phone that never plays a stage trailer never asks for one here.
   */
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!currentGame) return;
    seedGame(currentGame);
    void queryClient.prefetchQuery(gameQuery(currentGame.id));
  }, [currentGame, queryClient]);

  const { data: trailer } = useQuery({
    queryKey: ['stage-trailer', currentGame?.id],
    queryFn: () => getMovies(currentGame!.id),
    select: (r) => pickTrailer(r.results, currentGame?.name ?? ''),
    enabled: wantsTrailer && currentGame != null,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (slides.length === 0) return null;
  const current = slides[Math.min(index, slides.length - 1)];

  const onLayout = (event: LayoutChangeEvent) =>
    setMeasured(Math.round(event.nativeEvent.layout.width));

  const surprise = () => {
    const pool = games.length > 0 ? games : slides.map((s) => s.game);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/game/${pick.id}`);
  };

  /**
   * Which slide the overlay is describing.
   *
   * Rounded from the offset rather than taken from a momentum callback:
   * a web browser's inertial scroll and a trackpad flick do not both
   * end in one, and the copy must never disagree with the picture it is
   * written over. Guarded so the state only moves when the page does.
   */
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      // The value drives an opacity, which the native driver can own;
      // the listener still runs so the copy knows which slide it is.
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (width <= 0) return;
        const next = Math.round(event.nativeEvent.contentOffset.x / width);
        const clamped = Math.min(Math.max(next, 0), slides.length - 1);
        if (clamped !== index) setIndex(clamped);
      },
    }
  );

  /** Page by tap: the dots, and the desk's chevrons. */
  const goTo = (to: number) => {
    const clamped = Math.min(Math.max(to, 0), slides.length - 1);
    if (clamped === index) return;
    list.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  };

  /**
   * The picture is the whole stage, on every screen.
   *
   * It was split for one build — a landscape band with the copy on the
   * page below it — on the argument that type over a photograph is a
   * compromise. On a real phone the split read as a banner pasted to
   * the top of a form: two flat zones with no shared light, and a
   * publisher's banner whose logo-space became a white smear against
   * the navy. The billboards this borrows from all keep the words IN
   * the picture on a phone; what makes them feel expensive is depth,
   * which is a long melt and the artwork's light reaching into the
   * page. That is what the layers below do.
   */
  const band = height;

  /**
   * The artwork's light, reaching into the page.
   *
   * A blurred copy of the slide on show sits under the stage's lower
   * half and runs on past its foot, so the ground the browse row stands
   * on is lit by the picture above it rather than cut off from it. It
   * is the same move the desk makes with its backdrop and the one thing
   * the great mobile billboards all share: the hero and the page read
   * as one object because they are made of the same light. Thumb-sized
   * and blurred to nothing but colour, so it costs a few kilobytes.
   */
  const glow = isCompact
    ? mediaUri(current.game.background_image, 100)
    : undefined;

  return (
    <View style={{ height }} onLayout={onLayout}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              top: Math.round(height * 0.45),
              height: Math.round(height * 0.55) + GLOW_BLEED,
            },
          ]}
        >
          <Image
            source={{ uri: glow }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={70}
            transition={DURATION.slow}
            accessible={false}
            alt=""
          />
          <LinearGradient
            colors={['rgba(51,61,81,0)', 'rgba(51,61,81,0)', COLORS.darkGrey]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      <View style={[styles.stage, { height }]}>
        <Animated.FlatList
          ref={list}
          testID="stage-band"
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(slide) => slide.key}
          // Every slide is exactly the viewport, so the offset is
          // arithmetic rather than measurement.
          style={{ height: band }}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index: slideIndex }) => (
            <SlideArt
              slide={item}
              index={slideIndex}
              width={width}
              height={band}
              headerHeight={headerHeight}
              trailer={slideIndex === index && dwelt ? (trailer ?? null) : null}
            />
          )}
        />
        {/* The copy and its controls, held still while the pictures move.

          They used to travel inside each slide, which meant the button
          under your thumb slid away as you swiped and the page dots -
          which stand for the whole set - moved when one member of it
          changed. Buttons and an indicator are controls FOR the
          carousel, not contents of it, so they sit above the list and
          swap what they say. box-none so the swipe still reaches the
          artwork everywhere except on the controls themselves. */}
        <StageCopy
          key={current.key}
          slide={current}
          index={index}
          count={slides.length}
          inset={inset}
          width={width}
          scrollX={scrollX}
          onOpen={() => router.push(`/game/${current.game.id}`)}
          onSurprise={surprise}
          onGoTo={goTo}
        />
      </View>
    </View>
  );
}

/** How far the picture's light runs on past the stage, into the page. */
const GLOW_BLEED = 160;

/**
 * Where the picture stops being a picture.
 *
 * A long melt, not a fade at the edge. Full strength through the upper
 * two fifths, then a slow dissolve that reaches nothing at the foot —
 * so the copy sits inside the picture's last third with the artwork
 * still faintly around it, darkened rather than gone. That is the whole
 * difference between a billboard and a strip with words under it.
 */
const fadeOut: ViewStyle =
  Platform.OS === 'web'
    ? ({
        maskImage:
          'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.18) 90%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.18) 90%, rgba(0,0,0,0) 100%)',
      } as unknown as ViewStyle)
    : {};

/** One slide's artwork and its scrims. The words live above the list. */
function SlideArt({
  slide,
  index,
  width,
  height,
  headerHeight,
  trailer,
}: {
  slide: StageSlide;
  index: number;
  width: number;
  height: number;
  headerHeight: number;
  /** Set once the dwell has elapsed on this slide; null unmounts it. */
  trailer: Movie | null;
}) {
  const reduced = useReducedMotion();
  const { isExpanded } = useBreakpoint();
  const drift = useAnimatedValue(0);
  const parallax = useStageParallax(height);
  const room = Math.round(height * PARALLAX_RATE);

  /**
   * The publisher's hero behind the copy, on the desk.
   *
   * A hero is a 3:1 banner composed with the subject to one side and
   * room for a logo on the other — exactly the stage's own shape on a
   * wide screen. The phone's stage is a portrait crop that keeps a
   * third of it, and the third it keeps can be the empty logo-space:
   * one build tried it and got a white field with a car in the corner.
   * The key art is composed for a portrait crop, so the phone keeps it.
   */
  const { data: art } = useQuery({
    ...artQuery(slide.game),
    enabled: isExpanded && Boolean(slide.game.slug),
  });
  const artwork =
    isExpanded && art?.hero ? art.hero.url : slide.game.background_image;

  useEffect(() => {
    if (reduced) return;
    // Out and back, so it never arrives anywhere and never snaps home.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: DURATION.drift,
          easing: EASING.linear,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: DURATION.drift,
          easing: EASING.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduced]);

  return (
    // Clips its own artwork. The drift scales the art layer up to 1.08,
    // which spills four percent of the width past each edge — so the
    // slide waiting off-screen to the right was painting a strip of
    // itself over the one you were looking at. Nothing in the layout
    // shows this: the boxes are all exactly a viewport wide, and it is
    // the paint that overflows.
    <View
      style={{ width, height, overflow: 'hidden' }}
      testID={`stage-slide-${index}`}
    >
      {/* Hung above the frame, by exactly as far as it can travel down.
          Translating a picture that exactly fills its container just
          uncovers the background; room below it would buy nothing, since
          the artwork only ever moves one way. */}
      <View style={[StyleSheet.absoluteFill, fadeOut]}>
        <Animated.View
          style={[
            styles.artLayer,
            {
              top: -room,
              height: height + room,
              transform: [
                { translateY: parallax },
                {
                  scale: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <CoverImage
            uri={artwork}
            fallbackUri={slide.game.background_image}
            style={StyleSheet.absoluteFill}
            size="hero"
            iconSize={48}
          />
        </Animated.View>
        {/* Under the scrims, so the copy stays legible over a moving
          picture exactly as it was over the still. Keyed so a new
          trailer is a fresh fade rather than a source swap. */}
        {trailer ? <StageTrailer key={trailer.id} movie={trailer} /> : null}
      </View>
      {/* On a desk, a third scrim runs left to right. The copy lives in
          the frame's left third there, and a bottom-only gradient left
          it reading across the picture's brightest region; the
          streaming mastheads all dim the copy's side and let the art
          stay loud on the other. It fades out by the midline so the
          right half is the untouched picture. */}
      {isExpanded ? (
        <LinearGradient
          colors={[
            'rgba(39,47,63,0.82)',
            'rgba(39,47,63,0.45)',
            'rgba(39,47,63,0)',
          ]}
          locations={[0, 0.34, 0.62]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {/* Two scrims, not one. The bottom one buys legibility for the copy;
          the top one lets the header's own gradient land on something
          rather than on whatever the artwork happened to be. */}
      <LinearGradient
        colors={[
          'rgba(39,47,63,0.32)',
          'rgba(39,47,63,0.15)',
          'rgba(39,47,63,0)',
        ]}
        locations={[0, 0.45, 1]}
        /**
         * A long, light tail — not a second opaque band.
         *
         * The header paints its own gradient, solid for its first half
         * and gone by its last pixel. Doubling that with a heavy scrim
         * flattened the top of the picture and then dropped it all at
         * once, which is what read as a cut edge. This only has to carry
         * the artwork past the point where the header lets go.
         */
        style={[styles.topScrim, { height: Math.round(headerHeight * 2.4) }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={
          Platform.OS === 'web'
            ? [
                'rgba(51,61,81,0)',
                'rgba(51,61,81,0.5)',
                'rgba(51,61,81,0.55)',
                'rgba(51,61,81,0.25)',
                'rgba(51,61,81,0)',
              ]
            : [
                'rgba(51,61,81,0)',
                'rgba(51,61,81,0.5)',
                'rgba(51,61,81,0.9)',
                COLORS.darkGrey,
                COLORS.darkGrey,
              ]
        }
        /**
         * Solid before the edge, not at it.
         *
         * Going opaque only at the last pixel was fine over a still,
         * where the residual twelve percent of picture is invisible.
         * Over a bright, moving trailer it is a lighter band that ends
         * in one hard line where the page ground begins - measured at
         * 3x, plainly there. The gradient now reaches the page's own
         * colour seven percent above the stage's bottom and holds it,
         * so the stage meets the page darkGrey on darkGrey and the join
         * cannot be seen. The picture still fades, not stops: the
         * solid strip is the last forty pixels of a 400-pixel dissolve.
         * The stops are the page ground's own RGB, not the navy the
         * old stops carried - a navy scrim ending in grey was itself a
         * colour step at the join.
         */
        locations={[0, 0.45, 0.8, 0.93, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />
    </View>
  );
}

/**
 * The words over the stage, and the controls that drive it.
 *
 * Mounted once and re-keyed on the slide, so changing page replays the
 * staggered entrance as a swap in place rather than sliding the whole
 * block off the screen. It spans the stage so the headline keeps its
 * left margin, and passes touches through everywhere it is not a
 * control - the artwork underneath is still what you swipe.
 */
function StageCopy({
  slide,
  index,
  count,
  inset,
  width,
  scrollX,
  onOpen,
  onSurprise,
  onGoTo,
}: {
  slide: StageSlide;
  index: number;
  count: number;
  inset: number;
  width: number;
  /** The list's scroll offset, so the words can cross the join. */
  scrollX: Animated.Value;
  onOpen: () => void;
  onSurprise: () => void;
  onGoTo: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const { isExpanded } = useBreakpoint();
  const enter = useAnimatedValue(reduced ? 1 : 0);

  /**
   * The publisher's mark instead of the typed name — the billboard's
   * grammar. Every slide's title is now the game's name and nothing
   * else, so the mark stands in for all of them; it used to have to
   * push a verb up into the eyebrow on the Tonight slide, which made
   * a line reading "THURSDAY, SEPTEMBER 3 · TONIGHT · CONTINUE" — the
   * loudest thing on the page and the least worth reading.
   */
  const { data: art } = useQuery({
    ...artQuery(slide.game),
    enabled: Boolean(slide.game.slug),
  });
  const logo = art?.logo;

  /**
   * The headline scales with the stage.
   *
   * 32px is an app heading — correct in a list, timid across a picture
   * that fills the screen. It reads as a caption someone left on the
   * artwork rather than as the page speaking. Tied to the width so a
   * phone gets a headline and a monitor gets a masthead, with the line
   * height and tracking following it; large display type set at a body
   * face's proportions looks loose and unresolved.
   */
  /**
   * ...and with the sentence, not only the screen.
   *
   * Width alone gave "Continue GreedFall: The Dying World" the same
   * 45pt as "Continue Hades", so the long one wrapped to three lines
   * and took the whole stage - the picture it is set over stopped being
   * visible and the headline read as a wall. A masthead is sized to its
   * words in print for exactly this reason: the longer the title, the
   * smaller it is set, so the block it makes stays the same shape.
   */
  const length = slide.title.length;
  const fit = length > 32 ? 0.76 : length > 22 ? 0.88 : 1;
  /**
   * Capped lower on a desk than the width alone would allow. At 56 in
   * a 640 column "Continue Grand Theft Auto V" broke to leave "V" on a
   * line of its own - the orphan is the tell of a headline set to fill
   * a frame rather than to fit its sentence. 48 across the wider desk
   * column holds a 27-character title on one line.
   */
  /**
   * Capped lower on a desk than the width alone would allow. At 56 in
   * a 640 column "Continue Grand Theft Auto V" broke to leave "V" on a
   * line of its own - the orphan is the tell of a headline set to fill
   * a frame rather than to fit its sentence. 48 across the wider desk
   * column holds a 27-character title on one line.
   */
  const cap = isExpanded ? 48 : 52;
  const fontSize = Math.round(Math.min(Math.max(width * 0.094 * fit, 26), cap));
  const display = {
    fontSize,
    lineHeight: Math.round(fontSize * 1.02),
    letterSpacing: fontSize > 46 ? -1.6 : -0.9,
    /**
     * Room for the last line's descenders.
     *
     * The leading is deliberately tighter than the em box — display
     * type set at a body face's line height looks loose — but a 1.02
     * line box ends above the face's own descender, so the tail of a
     * "g" in the last line was sliced flat: measured, the text block
     * clipped 8px of itself at 68pt. Padding under the block gives the
     * final line its descender back without loosening the leading
     * between lines, which is the whole point of setting it tight.
     */
    paddingBottom: Math.ceil(fontSize * 0.16),
  };

  useEffect(() => {
    if (reduced) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: true,
    }).start();
  }, [enter, reduced]);

  /**
   * Out on the way across, in on the way down.
   *
   * The words belong to the slide under them, and the slide changes at
   * the halfway point of the drag - so held at full strength they cut
   * from one game's sentence to another's mid-gesture, over artwork
   * that was still sliding smoothly. Fading on the distance from the
   * nearest page means the block is gone before the swap and back
   * after it, and a swipe that changes its mind and springs back never
   * shows a flicker. Reduced motion holds it at one and takes the cut.
   */
  const crossing = reduced
    ? 1
    : Animated.modulo(
        Animated.divide(scrollX, Math.max(width, 1)),
        1
      ).interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 1] });

  /**
   * One value, four arrivals.
   *
   * Each line reads a different window of the same timeline, so the
   * eyebrow is settling while the headline is still on its way and the
   * buttons have not started. Four separate animations would say the
   * same thing and cost four times as much to keep in step.
   */
  const step = (from: number, to: number) => ({
    opacity: enter.interpolate({
      inputRange: [from, to],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [from, to],
          outputRange: [14, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* The shadows come back only where the words are over the
          picture. On the page's own ground they are a smudge under
          clean type, and the reason they existed - a scrim that stops
          short of solid, over whatever RAWG sent - is a desk problem
          now. */}
      <Animated.View
        style={[
          styles.copy,
          isExpanded && styles.copyWide,
          { left: inset, right: inset, opacity: crossing },
        ]}
      >
        {/* The reason, then the date — in that order and in two
            weights. The date used to lead and to be spelled out in
            full ("THURSDAY, SEPTEMBER 3 · TONIGHT"), which put thirty
            characters of tracked caps in front of the one word that
            says why this game is on the screen. */}
        <Animated.Text style={[styles.eyebrow, step(0, 0.4)]} numberOfLines={1}>
          {slide.eyebrow.toUpperCase()}
          {slide.date ? (
            <Text style={styles.eyebrowDate}>{`  ${slide.date}`}</Text>
          ) : null}
        </Animated.Text>
        <Animated.View style={step(0.1, 0.6)}>
          <TitleLogo
            logo={logo}
            name={slide.game.name}
            // The copy column's own width, and no taller than the two
            // lines of headline the mark stands in for.
            maxWidth={Math.max(
              (isExpanded ? Math.min(width * 0.5, 560) : width - inset * 2) -
                24,
              0
            )}
            maxHeight={Math.round(fontSize * 2.1)}
            style={styles.logo}
          >
            <Text style={[styles.title, display]} numberOfLines={3}>
              {slide.title}
            </Text>
          </TitleLogo>
        </Animated.View>
        {/* How far through, for a game already under way.
            The stage's whole claim is that it knows your library, and
            it was making that claim in a grey sentence. Eighteen and a
            half hours of twenty-one is a picture, and the app already
            had the numbers. */}
        {slide.progress != null ? (
          <Animated.View style={[styles.track, step(0.18, 0.7)]}>
            <View
              style={[
                styles.trackFill,
                { width: `${Math.round(slide.progress * 100)}%` },
              ]}
            />
          </Animated.View>
        ) : null}
        {/* The figure in the app's own figure treatment, the sentence
            after it. "2.5h left. Already under way — chip away at it."
            set the one fact the reader came for in the same grey as
            the encouragement that followed it. */}
        <Animated.Text
          style={[styles.detail, step(0.22, 0.75)]}
          numberOfLines={2}
        >
          {slide.figure ? (
            <>
              <Text style={styles.figure}>{slide.figure}</Text>
              {'  ·  '}
            </>
          ) : null}
          {slide.detail}
        </Animated.Text>
        <Animated.View style={[styles.actions, step(0.34, 0.9)]}>
          <ScaleButton
            onPress={onOpen}
            style={styles.primary}
            activeScale={0.96}
            hoverScale={1.04}
            accessibilityLabel={`${slide.action}: ${slide.game.name}`}
          >
            <Text style={styles.primaryLabel}>{slide.action}</Text>
            <Ionicons name="arrow-forward" size={15} color={COLORS.navy} />
          </ScaleButton>
          <Pressable
            onPress={onSurprise}
            style={styles.ghost}
            accessibilityRole="button"
            accessibilityLabel="Open a random game"
          >
            <Ionicons name="dice-outline" size={16} color={COLORS.lightGrey} />
            <Text style={styles.ghostLabel}>Surprise me</Text>
          </Pressable>
          {/* On a wide stage they ride the end of the action row
              instead of stranding themselves against the far edge. */}
          {count > 1 && !isExpanded && (
            <Dots count={count} index={index} onGoTo={onGoTo} />
          )}
        </Animated.View>
      </Animated.View>
      {/* On a desk the dots take the frame's own corner, the way a
          billboard's page indicator does, rather than riding the end of
          the action row a screen's width from the frame's edge. */}
      {count > 1 && isExpanded && (
        <View style={[styles.dotsCorner, { right: inset }]}>
          <Dots count={count} index={index} onGoTo={onGoTo} />
        </View>
      )}
      {/* The desk has no swipe. A trackpad can drag the list and a
          touchscreen laptop can flick it, but a mouse could only ever
          reach the second slide by accident - so the two thirds of the
          stage nobody was told about went unseen. Every other shelf on
          this page pages by chevron; the largest one on it should not
          be the exception. */}
      {count > 1 && isExpanded && (
        <>
          {index > 0 && (
            <Chevron
              side="left"
              inset={inset}
              onPress={() => onGoTo(index - 1)}
            />
          )}
          {index < count - 1 && (
            <Chevron
              side="right"
              inset={inset}
              onPress={() => onGoTo(index + 1)}
            />
          )}
        </>
      )}
    </View>
  );
}

/**
 * The page indicator, which is also how you turn the page.
 *
 * It was a decoration - `pointerEvents: none` - so on a desk the only
 * way to the other slides was to guess that the picture could be
 * dragged. A row of marks that says "there are three of these" and
 * does nothing when pressed is a control that has been drawn but not
 * wired. The marks stay six points; the press target around each one
 * is the full row height, which is what a thumb needs.
 */
function Dots({
  count,
  index,
  onGoTo,
}: {
  count: number;
  index: number;
  onGoTo: (index: number) => void;
}) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          onPress={() => onGoTo(i)}
          hitSlop={{ top: 14, bottom: 14, left: 5, right: 5 }}
          accessibilityRole="button"
          accessibilityState={{ selected: i === index }}
          accessibilityLabel={`Slide ${i + 1} of ${count}`}
        >
          <View style={[styles.dot, i === index && styles.dotOn]} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Prev and next, on the desk, at the frame's own vertical middle.
 *
 * Absent at the ends rather than dimmed: a greyed disc over a bright
 * still is a smudge on the artwork, and the one at the left edge sits
 * directly above the headline where a smudge is least welcome. They
 * are absolutely positioned, so nothing reflows when one goes.
 */
function Chevron({
  side,
  inset,
  onPress,
}: {
  side: 'left' | 'right';
  inset: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chevron,
        side === 'left' ? { left: inset } : { right: inset },
      ]}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? 'Previous slide' : 'Next slide'}
    >
      <Ionicons
        name={side === 'left' ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color={COLORS.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * No ground of its own. It used to paint the page colour and then, at
   * the bottom, a copy of the page's grain - and no two copies of a
   * textured ground meet without a line, however exactly the numbers
   * agree; measured at 3x, the line was there with every other layer
   * removed. The page shows through instead: the artwork fades out on a
   * mask, and what is left at the stage's last rows IS the page.
   */
  stage: { overflow: 'hidden' },
  /**
   * Wider than the screen on both sides, because a blurred picture goes
   * soft at its own edges and a soft edge inside the frame would read
   * as a vignette. Half strength: it is weather, not a second picture.
   */
  glow: {
    position: 'absolute',
    left: -80,
    right: -80,
    opacity: 0.55,
    zIndex: -1,
  },
  artLayer: { position: 'absolute', left: 0, right: 0 },
  /**
   * The picture fades out of existence, rather than a colour fading in
   * over it. Masking the art (and the trailer with it) to nothing at the
   * bottom edge means nothing at that edge but the page ground - the
   * scrim below is for the copy's legibility, and it too goes to
   * transparent. Web only: the mask is CSS, and native keeps the scrim
   * ending opaque.
   */

  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%' },
  copy: {
    position: 'absolute',
    /**
     * Inside the picture, not on its rim. At twenty the action row sat
     * on the last rows of the stage, where the artwork has already
     * faded to the page's own grey — so the buttons read as the first
     * thing on the page below rather than the last thing in the
     * picture above. The desk got this fix and the phone did not.
     */
    bottom: SPACING.xl,
    gap: SPACING.xs,
    /**
     * Capped, even on a 1600px stage. A headline set across the whole
     * width stops being a headline, and the page indicator that rides
     * the end of the action row ends up marooned against the far edge,
     * a screen away from the buttons it belongs to.
     */
    maxWidth: 640,
  },
  /**
   * Inside the frame, not on its rim. On a desk the copy sits up off
   * the bottom edge by the same inset it keeps from the left, so the
   * block reads as placed in the picture rather than resting on the
   * shelf below it; and the column widens to hold a full title.
   */
  copyWide: { bottom: SPACING.xl * 1.5, maxWidth: 720 },
  dotsCorner: {
    position: 'absolute',
    // The action row's centre line: copy bottom (48) plus half a 40pt
    // button, less half a dot. Measured, not eyeballed.
    bottom: SPACING.xl * 1.5 + 20 - 2,
  },
  /**
   * A plate, not a bare glyph. It sits over whatever the artwork
   * happens to be at the frame's midline, which on a bright still is
   * white on white; the disc is the same one the game page's back
   * button uses and for the same reason.
   */
  chevron: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,25,35,0.55)',
  },

  /**
   * The copy carries its own legibility.
   *
   * Now that the scrim stops short of solid, the artwork behind these
   * lines is whatever RAWG sent — and against a bright frame the sums
   * come out near 3:1, under the 4.5 normal text needs. Nothing
   * automated catches it: axe cannot evaluate a photograph. A soft dark
   * shadow buys the contrast back without painting over the picture,
   * which is the whole reason the scrim was lifted.
   */
  /**
   * Light caps, not amber. The accent was speaking four times in one
   * block - eyebrow, figure, button, dot - and a colour that says
   * everything says nothing. It now marks the primary action alone.
   */
  eyebrow: {
    ...TYPE.tag,
    ...OVER_IMAGE.body,
    color: COLORS.white,
    marginBottom: 2,
  },
  /** Proof the page is today's, at the volume proof deserves. */
  eyebrowDate: { color: 'rgba(216,218,228,0.62)' },
  /** The mark's own breathing room, where the headline's leading was. */
  logo: { marginVertical: 6 },
  title: {
    ...TYPE.display,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
  },
  detail: {
    ...TYPE.body,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
    marginTop: 2,
    marginBottom: SPACING.md,
    maxWidth: 460,
  },
  /**
   * The one number, in the colour this app gives to time everywhere
   * else. Amber is spoken for by the primary button in this block, so
   * it is deliberately the same voice: both are about the hours you
   * have, which is the only thing the button is offering to spend.
   */
  figure: { ...TYPE.label, color: COLORS.accent },
  /**
   * How far through. Two points tall and no label: the sentence beside
   * it already says "2.5h left", so this is the shape of that sentence
   * and not a second copy of it. Full width of the copy column, capped
   * with it, so the bar and the headline share an edge.
   */
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 6,
    maxWidth: 240,
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
  },
  primaryLabel: {
    ...TYPE.label,
    color: COLORS.navy,
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    // The plate alone. A border on a secondary action gives it the same
    // visual spend as the primary beside it; the quiet fill keeps the
    // hit target visible without competing.
    backgroundColor: COLORS.plate,
  },
  ghostLabel: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  dots: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  /**
   * Six points, not five, and half-lit rather than a third. Over a
   * photograph the old ones read as dust on the screen — the only
   * thing on the stage saying there is more than one slide, and it was
   * the least visible mark on it.
   */
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotOn: { width: 18, backgroundColor: COLORS.white },
});
