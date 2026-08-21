import { useEffect } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { EASING } from '@/styles/motion';

import { Mark } from './Mark';

/**
 * The Mark, inking itself in.
 *
 * The landing hero is the one place the logo is a protagonist rather
 * than a wayfinding glyph, and a protagonist gets an entrance: the
 * plinth's outline draws first, the shaft rises out of it, the ball's
 * circle closes, and only then do the fills arrive and the construction
 * lines fade. It reads as somebody drawing the mark, which is the
 * warmest thing a logo can do and impossible to mistake for a fade.
 *
 * Everything here is the app's own geometry — the same paths Mark.tsx
 * ships — animated with stroke dashes, which is all "self-drawing SVG"
 * has ever been: a dash as long as the path, slid from fully offset to
 * zero. No animation library involved, and it runs on native too.
 *
 * The dash lengths are deliberate overestimates. A dash longer than its
 * path finishes drawing slightly early in the window, which nobody can
 * see; a dash shorter than its path leaves a permanent stub, which
 * everybody can.
 */

// Geometry duplicated from Mark.tsx deliberately — that file's values
// are private to it, and exporting them for one animation would widen
// its surface for no reader's benefit.
const HEX =
  'M42.00 12.62A16 16 0 0 1 58.00 12.62L78.37 24.38A16 16 0 0 1 86.37 38.24' +
  'L86.37 61.76A16 16 0 0 1 78.37 75.62L58.00 87.38A16 16 0 0 1 42.00 87.38' +
  'L21.63 75.62A16 16 0 0 1 13.63 61.76L13.63 38.24A16 16 0 0 1 21.63 24.38Z';
const SQUASH = 0.46;
const PLINTH_CY = 73;
const PLINTH_DEPTH = 9;
const BALL_CY = 26;
const BALL_R = 19;
const SHAFT_WIDTH = 11;
const SHADE = '#CBD1DC';
const VIEW_BOX = '4 6 92 92';

const layFlat = (cy: number) =>
  `translate(0 ${cy}) scale(1 ${SQUASH}) translate(0 -50)`;

const SHAFT = `M50 ${PLINTH_CY + 4} L50 ${BALL_CY + BALL_R * 0.5}`;

/** Path lengths, overestimated. See above. */
const HEX_LEN = 300;
const BALL_LEN = 130;
const SHAFT_LEN = 50;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export function MarkDraw({ size = 26 }: { size?: number }) {
  const reduced = useReducedMotion();
  const draw = useAnimatedValue(0);

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(draw, {
      toValue: 1,
      duration: 1500,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [draw, reduced]);

  // Somebody who asked for less motion gets the finished drawing.
  if (reduced) return <Mark size={size} />;

  const over = (from: number, to: number, range: [number, number]) =>
    draw.interpolate({
      inputRange: [from, to],
      outputRange: range,
      extrapolate: 'clamp',
    });

  const inkFade = over(0.62, 0.95, [1, 0]);
  const fillFade = over(0.55, 0.9, [0, 1]);

  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      {/* The finished object, arriving under its own construction. */}
      <AnimatedG opacity={fillFade}>
        <G transform={layFlat(PLINTH_CY + PLINTH_DEPTH)}>
          <Path d={HEX} fill={SHADE} />
        </G>
        <G transform={layFlat(PLINTH_CY)}>
          <Path d={HEX} fill={COLORS.white} />
        </G>
        <Path
          d={SHAFT}
          stroke={COLORS.white}
          strokeWidth={SHAFT_WIDTH}
          strokeLinecap="round"
        />
        <Circle cx={50} cy={BALL_CY} r={BALL_R} fill={COLORS.accent} />
      </AnimatedG>

      {/* The construction lines. Plinth, then shaft, then ball —
          bottom-up, the order a person draws a thing that stands. */}
      <AnimatedG opacity={inkFade}>
        <G transform={layFlat(PLINTH_CY)}>
          <AnimatedPath
            d={HEX}
            fill="none"
            stroke={COLORS.white}
            strokeWidth={4}
            strokeDasharray={`${HEX_LEN}`}
            strokeDashoffset={over(0, 0.4, [HEX_LEN, 0])}
          />
        </G>
        <AnimatedPath
          d={SHAFT}
          fill="none"
          stroke={COLORS.white}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${SHAFT_LEN}`}
          strokeDashoffset={over(0.2, 0.5, [SHAFT_LEN, 0])}
        />
        <AnimatedCircle
          cx={50}
          cy={BALL_CY}
          r={BALL_R}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={3}
          strokeDasharray={`${BALL_LEN}`}
          strokeDashoffset={over(0.38, 0.72, [BALL_LEN, 0])}
        />
      </AnimatedG>
    </Svg>
  );
}
