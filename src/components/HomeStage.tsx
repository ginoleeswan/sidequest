import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { StageTrailer } from './StageTrailer';
import { getMovies } from '@/api/rawg';
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
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(next, 0), slides.length - 1);
    if (clamped !== index) setIndex(clamped);
  };

  return (
    <View style={[styles.stage, { height }]} onLayout={onLayout}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide) => slide.key}
        // Every slide is exactly the viewport, so the offset is
        // arithmetic rather than measurement.
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
            height={height}
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
        onOpen={() => router.push(`/game/${current.game.id}`)}
        onSurprise={surprise}
      />
    </View>
  );
}

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
      <View style={[StyleSheet.absoluteFill, styles.fadeOut]}>
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
            uri={slide.game.background_image}
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
  onOpen,
  onSurprise,
}: {
  slide: StageSlide;
  index: number;
  count: number;
  inset: number;
  width: number;
  onOpen: () => void;
  onSurprise: () => void;
}) {
  const reduced = useReducedMotion();
  const { isExpanded } = useBreakpoint();
  const enter = useAnimatedValue(reduced ? 1 : 0);

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
  const cap = isExpanded ? 48 : 56;
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
      <View
        style={[
          styles.copy,
          isExpanded && styles.copyWide,
          { left: inset, right: inset },
        ]}
      >
        <Animated.Text style={[styles.eyebrow, step(0, 0.4)]} numberOfLines={1}>
          {slide.eyebrow.toUpperCase()}
        </Animated.Text>
        <Animated.Text
          style={[styles.title, display, step(0.1, 0.6)]}
          numberOfLines={3}
        >
          {slide.title}
        </Animated.Text>
        <Animated.Text
          style={[styles.detail, step(0.22, 0.75)]}
          numberOfLines={2}
        >
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
          {/* Each slide draws its own position, so there is no scroll
              listener and nothing to keep in sync. On a wide stage they
              ride the end of the action row instead of stranding
              themselves against the far edge. */}
          {count > 1 && !isExpanded && (
            <View style={styles.dots} pointerEvents="none">
              {Array.from({ length: count }, (_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === index && styles.dotOn]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </View>
      {/* On a desk the dots take the frame's own corner, the way a
          billboard's page indicator does, rather than riding the end of
          the action row a screen's width from the frame's edge. */}
      {count > 1 && isExpanded && (
        <View
          style={[styles.dotsCorner, { right: inset }]}
          pointerEvents="none"
        >
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      )}
    </View>
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
  artLayer: { position: 'absolute', left: 0, right: 0 },
  /**
   * The picture fades out of existence, rather than a colour fading in
   * over it. Masking the art (and the trailer with it) to nothing at the
   * bottom edge means nothing at that edge but the page ground - the
   * scrim below is for the copy's legibility, and it too goes to
   * transparent. Web only: the mask is CSS, and native keeps the scrim
   * ending opaque.
   */
  fadeOut:
    Platform.OS === 'web'
      ? ({
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 52%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 52%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0) 100%)',
        } as unknown as ViewStyle)
      : {},
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%' },
  copy: {
    position: 'absolute',
    bottom: SPACING.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    color: COLORS.lightGrey,
    marginBottom: 2,
  },
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
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  dotOn: { width: 16, backgroundColor: COLORS.white },
});
