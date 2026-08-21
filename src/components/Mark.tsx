import Svg, { Circle, G, Path } from 'react-native-svg';

import { COLORS } from '@/styles/colors';

/**
 * The Sidequest mark: an arcade joystick standing on a hexagonal plinth.
 *
 * A joystick means play without naming a platform — not a pad tied to a
 * console generation, not a cartridge tied to an era. The hexagon is the
 * base seen in perspective: foreshortened and given a side, so the whole
 * mark reads as an object standing on a surface rather than a pictogram
 * sitting in a badge.
 *
 * The hexagon deliberately is not a frame around the joystick. Cutting a
 * joystick out of a container was the obvious move and it fails: a ball
 * over a wide base inside an outline is topologically a head over
 * shoulders, so every version of it read as a user-profile avatar —
 * fatal for something that has to sit in a nav bar. Standing the stick on
 * the shape instead of inside it breaks that silhouette completely.
 */

/** The plinth's plan: a rounded hexagon, before foreshortening. */
const HEX =
  'M42.00 12.62A16 16 0 0 1 58.00 12.62L78.37 24.38A16 16 0 0 1 86.37 38.24' +
  'L86.37 61.76A16 16 0 0 1 78.37 75.62L58.00 87.38A16 16 0 0 1 42.00 87.38' +
  'L21.63 75.62A16 16 0 0 1 13.63 61.76L13.63 38.24A16 16 0 0 1 21.63 24.38Z';

/** How hard the plinth is foreshortened, and where it sits. */
const SQUASH = 0.46;
const PLINTH_CY = 73;
const PLINTH_DEPTH = 9;

/** The ball and the shaft that carries it. */
const BALL_CY = 26;
const BALL_R = 19;
const SHAFT_WIDTH = 11;

/** Lays the plan flat at a given height. */
const layFlat = (cy: number) =>
  `translate(0 ${cy}) scale(1 ${SQUASH}) translate(0 -50)`;

const SHAFT = `M50 ${PLINTH_CY + 4} L50 ${BALL_CY + BALL_R * 0.5}`;

/**
 * The plinth's side sits a step darker than its top. In one flat colour
 * the near edge was a hairline where two same-coloured shapes met, which
 * reads as a rendering artefact rather than a shape.
 */
const SHADE = '#CBD1DC';

/**
 * The mark's own bounds.
 *
 * Ninety-four units, not ninety-two: the plinth's near edge sits at
 * about y=99.9 once the hexagon is laid flat and given its depth, and
 * a box ending at 98 clipped it. At nav size that was a third of a
 * pixel and invisible; drawn at 148 on the landing page's hill it
 * sliced the base flat, which is why the logo looked like it was
 * sunk behind the crest rather than standing on it.
 */
const VIEW_BOX = '4 6 94 94';

interface Props {
  size?: number;
  /**
   * The plinth and shaft. Defaults to white, which is right on the app's
   * navy; pass a dark token on light surfaces, where white would vanish
   * and leave the ball floating with nothing under it.
   */
  color?: string;
  /** The ball. Defaults to the accent. */
  knob?: string;
  /** The plinth's side. Defaults to a step down from `color`. */
  shade?: string;
}

export function Mark({
  size = 22,
  color = COLORS.white,
  knob = COLORS.accent,
  shade = SHADE,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <G transform={layFlat(PLINTH_CY + PLINTH_DEPTH)}>
        <Path d={HEX} fill={shade} />
      </G>
      <G transform={layFlat(PLINTH_CY)}>
        <Path d={HEX} fill={color} />
      </G>
      <Path
        d={SHAFT}
        stroke={color}
        strokeWidth={SHAFT_WIDTH}
        strokeLinecap="round"
      />
      <Circle cx={50} cy={BALL_CY} r={BALL_R} fill={knob} />
    </Svg>
  );
}
