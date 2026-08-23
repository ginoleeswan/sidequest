import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Mark } from './Mark';
import { GLYPH_BOX, SEAM_GLYPHS } from './SeamGlyphs';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  backOut,
  easeInCubic,
  easeOutCubic,
  shaped,
  stops,
  type Keyframes,
} from '@/lib/curves';
import { COLORS } from '@/styles/colors';

/**
 * The splash, and the way it gets out of the way.
 *
 * The platform's own splash can only centre one image on one colour, so
 * this is where the rest of it lives: the wordmark down at the foot of
 * the screen, and a hand-off with some choreography in it rather than a
 * cut. The first frame is drawn to match that static image exactly — the
 * same mark, the same size, the same navy — so the moment the native
 * splash is dismissed nothing appears to happen. Everything after that
 * is this component's.
 *
 * What happens is the pile arriving. The stick is pushed down, springs
 * back, and the things a person who plays games owns — a pad, a d-pad,
 * a disc, a cartridge, a star, a life — are thrown out from under it and
 * off the edges of the screen. They are the same six silhouettes the
 * landing page's wavy seam is cut from: the app has one vocabulary of
 * objects, and this is its loudest use of it.
 *
 * Then the curtain accelerates past the viewer, so the app is arrived at
 * rather than swapped to.
 *
 * The motion is built the way animation has always been built rather
 * than by ramping numbers: the pop has a wind-up before it and squash
 * and stretch through it, the throw eases out hard and travels on arcs,
 * everything overshoots and settles, and the exit eases IN so it
 * accelerates away instead of drifting. See lib/curves — one linear
 * driver, sampled curves, so all of that stays one native-driven
 * transform per element.
 */

/** Matches `imageWidth` in the splash config. Both, or the hand-off jumps. */
const MARK = 145;

/**
 * The static splash, mirrored.
 *
 * The launch storyboard centres the mark and pins the wordmark to a
 * fixed margin off the bottom — see plugins/withSplashWordmark.js. This
 * curtain opens on exactly that picture and animates away from it, so
 * the two have to agree on three numbers: MARK above, and these two.
 *
 * The wordmark lives in a box the size of the storyboard's image view
 * rather than being positioned by its baseline, because that is what
 * the storyboard positions: the IMAGE, with the type centred inside it.
 * Matching the box is how the letters land in the same place.
 */
const WORDMARK_BOTTOM = 60;
const WORDMARK_BOX_H = 32;

/** The whole thing, start to gone. */
const RUN = 1250;

/**
 * Windows of the run, as fractions.
 *
 * They overlap on purpose: the throw leaves at the top of the pop rather
 * than after it, because beats that queue politely read as a list of
 * things happening rather than as one event.
 *
 * There is no window for the wordmark any more. It is already on screen
 * when this starts — the launch storyboard drew it — so it has nothing
 * to arrive from.
 */
const WINDUP = [0.05, 0.16] as const;
const FLIGHT = [0.17, 0.64] as const;
const EXIT = [0.7, 1] as const;

/**
 * How much of the flight window the staggered starts are spread over.
 *
 * A third, not a tenth. Launched almost together the objects read as one
 * puff that is over before it registers; spread this far the throw keeps
 * arriving for half a second, which is what makes it feel like a pile
 * coming out rather than a single pop.
 */
const STAGGER = 0.34;

/** How finely the flight paths are sampled. */
const STEPS = 18;

interface Spark {
  glyph: number;
  /** Where it goes, in degrees clockwise from straight up. */
  angle: number;
  /** How far, against the screen's half-diagonal. Over 1 leaves frame. */
  reach: number;
  size: number;
  /** Degrees it turns on the way out. */
  spin: number;
  /**
   * How far it bows off a straight line, in points.
   *
   * Nothing thrown travels along a radius. Signed, so the fan does not
   * curl all one way like a hair swirl.
   */
  arc: number;
  amber?: boolean;
}

/**
 * Eleven, hand-placed rather than random.
 *
 * All the way round, because a burst that only goes upward is a
 * fountain. Sizes, reaches and arcs are all uneven — an even ring of
 * identical things is a loading spinner, and the eye reads regularity
 * as machinery. Every reach is near or past 1, so these leave the
 * screen rather than fading out in the middle of it: the difference
 * between things being thrown and things evaporating.
 *
 * Three carry the accent — enough for the burst to have a colour, few
 * enough that it stays the amber the ball already owns.
 */
const SPARKS: Spark[] = [
  { glyph: 0, angle: -32, reach: 1.15, size: 70, spin: -40, arc: 26 },
  {
    glyph: 4,
    angle: 22,
    reach: 0.98,
    size: 39,
    spin: 62,
    arc: -18,
    amber: true,
  },
  { glyph: 2, angle: 68, reach: 1.22, size: 57, spin: 34, arc: 30 },
  { glyph: 5, angle: 112, reach: 0.94, size: 36, spin: -52, arc: -24 },
  { glyph: 3, angle: 152, reach: 1.18, size: 62, spin: 44, arc: 22 },
  {
    glyph: 1,
    angle: 196,
    reach: 1,
    size: 44,
    spin: -30,
    arc: -30,
    amber: true,
  },
  { glyph: 2, angle: 232, reach: 1.12, size: 34, spin: 70, arc: 18 },
  { glyph: 0, angle: 268, reach: 0.96, size: 52, spin: -22, arc: -20 },
  { glyph: 4, angle: 300, reach: 1.2, size: 42, spin: 48, arc: 28 },
  {
    glyph: 3,
    angle: 332,
    reach: 1.05,
    size: 47,
    spin: -36,
    arc: -16,
    amber: true,
  },
  { glyph: 5, angle: 348, reach: 0.9, size: 31, spin: 56, arc: 20 },
];

/**
 * Native only, and that is a design decision rather than an oversight.
 *
 * A splash covers a launch. On the web there is nothing to cover: the
 * document paints as soon as it arrives, and this component cannot run
 * a frame before hydration — measured on the built site, the curtain
 * mounted on top of a page the reader was already looking at, covered
 * it for a second, and left. A flash of the app, then a splash, then
 * the app again is worse than no splash at all, and it would spend a
 * second of every visit saying so.
 *
 * Native has a real gap to fill: the platform holds its own static
 * splash until the bundle is up, and this takes over from it mid-frame.
 */
const shouldRun = (): boolean => Platform.OS !== 'web';

/**
 * The knock, as a table of stops rather than an easing.
 *
 * It is four movements and no single curve describes them: settle down
 * into the wind-up, snap up past the top, come back under it, then
 * rest. The two scales are mirrored — wider while shorter, narrower
 * while taller — which is squash and stretch, and is what stops a
 * scaling object from reading as a zoom.
 */
const SQUASH_Y = stops([
  [0, 1],
  [WINDUP[0], 1],
  [WINDUP[1], 0.86],
  [0.23, 1.18],
  [0.3, 0.96],
  [0.38, 1.03],
  [0.46, 1],
]);
const SQUASH_X = stops([
  [0, 1],
  [WINDUP[0], 1],
  [WINDUP[1], 1.12],
  [0.23, 0.9],
  [0.3, 1.04],
  [0.38, 0.98],
  [0.46, 1],
]);
/** It sinks into the wind-up and rides the pop out of it. */
const DIP = stops([
  [0, 0],
  [WINDUP[0], 0],
  [WINDUP[1], 8],
  [0.23, -11],
  [0.31, 2],
  [0.4, 0],
]);

/**
 * One thrown object's vertical path: the radial travel, bowed.
 *
 * Built by hand rather than through `shaped` because two things happen
 * to the same number — the throw, which eases out, and the arc, which
 * peaks halfway and returns. Adding them per sample is what gets a
 * single interpolation out of both.
 */
function arcedY(
  window: readonly [number, number],
  radians: number,
  distance: number,
  arc: number
): Keyframes {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    inputRange.push(window[0] + (window[1] - window[0]) * t);
    outputRange.push(
      Math.sin(radians) * distance * easeOutCubic(t) -
        Math.sin(Math.PI * t) * arc
    );
  }
  return { inputRange, outputRange };
}

/** The same samples, in the units `rotate` insists on. */
function degrees(keyframes: Keyframes) {
  return {
    inputRange: keyframes.inputRange,
    outputRange: keyframes.outputRange.map((value) => `${value.toFixed(2)}deg`),
  };
}

export function SplashCurtain() {
  const [live, setLive] = useState(shouldRun);
  const reduced = useReducedMotion();
  const run = useAnimatedValue(0);
  const [screen, setScreen] = useState({ w: 390, h: 844 });

  useEffect(() => {
    if (!live) return;
    const animation = Animated.timing(run, {
      toValue: 1,
      // Reduced motion still gets the hand-off, just not the journey:
      // a hold long enough to read the wordmark, then out.
      duration: reduced ? 620 : RUN,
      // Linear on purpose. Every curve in here is drawn by the sampling
      // in lib/curves; easing the driver as well would bend all of them.
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && setLive(false));
    return () => animation.stop();
  }, [live, reduced, run]);

  if (!live) return null;

  const at = (frames: Keyframes) =>
    run.interpolate({ ...frames, extrapolate: 'clamp' });

  const half = Math.hypot(screen.w, screen.h) / 2;

  return (
    <Animated.View
      style={[
        styles.curtain,
        {
          // Fades late and fast, so it stays opaque through most of the
          // exit rather than showing the app through itself all the way.
          opacity: at(shaped(EXIT, 1, 0, easeInCubic)),
          transform: [
            {
              // Accelerating, not drifting: the curtain is pushed past
              // the viewer rather than dissolved in front of them.
              scale: reduced ? 1 : at(shaped(EXIT, 1, 1.14, easeInCubic)),
            },
          ],
        },
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreen((was) =>
          was.w === width && was.h === height ? was : { w: width, h: height }
        );
      }}
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.stage}>
        {/* Before the mark in the tree, so they come out from under it. */}
        {!reduced &&
          SPARKS.map((spark, index) => {
            // Each leaves a beat after the one before, and the stagger
            // is uneven — a metronome would give the throw a rhythm.
            const lead = ((index * 7) % SPARKS.length) / SPARKS.length;
            const span = FLIGHT[1] - FLIGHT[0];
            const window = [
              FLIGHT[0] + lead * STAGGER * span,
              FLIGHT[1],
            ] as const;
            const life = window[1] - window[0];
            const radians = ((spark.angle - 90) * Math.PI) / 180;
            const distance = half * spark.reach;
            return (
              <Animated.View
                key={`spark-${index}`}
                style={[
                  styles.spark,
                  {
                    // Snaps in, holds bright the whole way, gone as it
                    // clears the edge.
                    opacity: at(
                      stops([
                        [window[0], 0],
                        [window[0] + life * 0.1, 1],
                        [window[0] + life * 0.82, 1],
                        [window[1], 0],
                      ])
                    ),
                    transform: [
                      {
                        translateX: at(
                          shaped(
                            window,
                            0,
                            Math.cos(radians) * distance,
                            easeOutCubic
                          )
                        ),
                      },
                      {
                        translateY: at(
                          arcedY(window, radians, distance, spark.arc)
                        ),
                      },
                      { scale: at(shaped(window, 0.25, 1, backOut(2.2))) },
                      {
                        rotate: run.interpolate({
                          ...degrees(
                            shaped(window, 0, spark.spin, easeOutCubic)
                          ),
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Svg
                  width={spark.size}
                  height={spark.size}
                  viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`}
                >
                  <Path
                    d={SEAM_GLYPHS[spark.glyph]}
                    fill={spark.amber ? COLORS.accent : COLORS.lightGrey}
                    fillRule="evenodd"
                  />
                </Svg>
              </Animated.View>
            );
          })}

        <Animated.View
          style={{
            transform: reduced
              ? []
              : [
                  { translateY: at(DIP) },
                  { scaleX: at(SQUASH_X) },
                  { scaleY: at(SQUASH_Y) },
                ],
          }}
        >
          <Mark size={MARK} />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.foot,
          {
            /**
             * Already on screen, so it neither fades nor moves.
             *
             * The storyboard drew this word, at this size, in this box,
             * a moment ago. Animating it in would animate in something
             * the reader is looking at — and the point of matching the
             * splash was to make the hand-over invisible, not to have
             * something to play.
             *
             * The mark still dips and squashes above it. One element
             * moving reads as the app waking up; both moving reads as a
             * loading screen.
             */
            opacity: 1,
          },
        ]}
      >
        <Text style={styles.wordmark}>SIDEQUEST</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    // Above every screen, the tab bar and the onboarding sheet: this is
    // the app not having opened yet.
    zIndex: 100,
  },
  /**
   * Centred, and the origin every spark is thrown from — then lifted to
   * where the static splash drew the mark, so the first frame matches.
   */
  stage: { alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute' },
  foot: {
    position: 'absolute',
    bottom: WORDMARK_BOTTOM,
    height: WORDMARK_BOX_H,
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    // 20/7, matching the static splash. At 17 it read as fine print on
    // a launch screen, which is not what a wordmark is for.
    fontSize: 20,
    letterSpacing: 7,
    color: COLORS.white,
  },
});
