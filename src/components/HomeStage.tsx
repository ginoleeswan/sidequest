import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PARALLAX_RATE, useStageParallax } from '@/hooks/useStageParallax';
import type { StageSlide } from '@/lib/stage';
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

  if (slides.length === 0) return null;

  const onLayout = (event: LayoutChangeEvent) =>
    setMeasured(Math.round(event.nativeEvent.layout.width));

  const surprise = () => {
    const pool = games.length > 0 ? games : slides.map((s) => s.game);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/game/${pick.id}`);
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
        renderItem={({ item, index }) => (
          <Slide
            slide={item}
            index={index}
            count={slides.length}
            inset={inset}
            width={width}
            height={height}
            headerHeight={headerHeight}
            onOpen={() => router.push(`/game/${item.game.id}`)}
            onSurprise={surprise}
          />
        )}
      />
    </View>
  );
}

function Slide({
  slide,
  index,
  count,
  inset,
  width,
  height,
  headerHeight,
  onOpen,
  onSurprise,
}: {
  slide: StageSlide;
  index: number;
  count: number;
  inset: number;
  width: number;
  height: number;
  headerHeight: number;
  onOpen: () => void;
  onSurprise: () => void;
}) {
  const reduced = useReducedMotion();
  const enter = useAnimatedValue(reduced ? 1 : 0);
  const drift = useAnimatedValue(0);
  const parallax = useStageParallax(height);
  const room = Math.round(height * PARALLAX_RATE);

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
  const fontSize = Math.round(Math.min(Math.max(width * 0.094 * fit, 26), 56));
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
    Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: true,
    }).start();
  }, [enter, reduced]);

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
        colors={[
          'rgba(39,47,63,0)',
          'rgba(39,47,63,0.5)',
          'rgba(39,47,63,0.88)',
          COLORS.darkGrey,
        ]}
        // Reaching full opacity a fifth of the way from the bottom left
        // the lowest hundred pixels as a flat grey shelf with the buttons
        // sitting on it, and the picture appeared to stop rather than to
        // continue underneath. It only goes solid at the very last, where
        // it has to meet the page.
        locations={[0, 0.5, 0.88, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={[styles.copy, { left: inset, right: inset }]}>
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
          {count > 1 && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    // The page's own colour, so the bottom of the scrim lands on the
    // shelves' background instead of ending on a visible band.
    backgroundColor: COLORS.darkGrey,
    overflow: 'hidden',
  },
  artLayer: { position: 'absolute', left: 0, right: 0 },
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
   * The copy carries its own legibility.
   *
   * Now that the scrim stops short of solid, the artwork behind these
   * lines is whatever RAWG sent — and against a bright frame the sums
   * come out near 3:1, under the 4.5 normal text needs. Nothing
   * automated catches it: axe cannot evaluate a photograph. A soft dark
   * shadow buys the contrast back without painting over the picture,
   * which is the whole reason the scrim was lifted.
   */
  eyebrow: {
    ...TYPE.tag,
    ...OVER_IMAGE.body,
    color: COLORS.accent,
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
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    // A plate, for the same reason the header chips have one: an outline
    // with no fill was legible only because the scrim behind it was
    // solid, and it is not solid any more.
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
  dotOn: { width: 16, backgroundColor: COLORS.accent },
});
