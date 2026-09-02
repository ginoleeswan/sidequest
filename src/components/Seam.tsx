import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import {
  GLYPH_BOX,
  SEAM_GLYPHS,
  SEAM_GLYPH_NARROW,
  SEAM_SCATTER_NARROW,
  SEAM_SCATTER_WIDE,
} from './SeamGlyphs';
import { COLORS } from '@/styles/colors';

/**
 * The edge between two sections, at one of three volumes.
 *
 * The first version of this gave every band on the page the same
 * memory-card edge: chamfered corner, contact pins, lit lip, nine times
 * down the page. Each one was fine and the set was wallpaper — which is
 * the exact failure the decorated variant's own comment warns about,
 * committed one level up. A divider that is special everywhere is a
 * texture, and a page made of nine identical special moments has none.
 *
 * So there is a hierarchy now, and most seams sit at the bottom of it.
 *
 * **lip** — one lit hairline and nothing else. The default, and what a
 * boundary between two parts of the same argument should be. It says
 * "new paragraph", which is all that is wanted seven times out of nine.
 *
 * **card** — the memory-card edge: one corner cut on the diagonal, a
 * strip of contact pins on the flat side, the lit lip along the top. A
 * chapter break, for where the page genuinely changes subject. Its
 * chamfer alternates sides so two in view never rhyme.
 *
 * **wave** — the shoreline without the pile: the footer's own edge,
 * for where a picture ends and the page begins. A hero that stops on
 * a straight line reads as a banner pasted onto the page; on a drawn
 * waterline it reads as the page's own weather, and the depth under
 * the crest is what says the water is deeper than the ground.
 *
 * **glyphs** — the one decorated seam on the page: a skyline. The
 * pile's own belongings sit along the lit edge as solid silhouettes of
 * the incoming band, bases planted below the line, crowns rising above
 * it into the section before. Used exactly once, and it works because
 * every other seam the reader has passed was plain.
 *
 * Purely decorative at every volume, so hidden from assistive
 * technology entirely: a screen reader announcing "image" between every
 * section is a worse page, not a more accessible one.
 */

export type SeamVariant = 'lip' | 'card' | 'wave' | 'glyphs';

/** How tall a card edge is. */
const HEIGHT = 34;
/**
 * The wavy seam's face is deeper than a card edge, and the number is
 * derived, not felt: the wave's trough sits at WAVE_MID + WAVE_AMP,
 * and the biggest object's lower half hangs another 36pt below its
 * centre on that trough, plus a little rotation headroom. Shallower
 * faces sliced the bottoms off the biggest shapes at the viewBox —
 * the exact clipping bug this component has now hit from every
 * direction once.
 */
const GLYPH_FACE = 68;
/** A plain lip needs no body — only the line and a little air under it. */
const LIP_HEIGHT = 18;
/**
 * The shoreline's face: the wave's trough plus the depth shadow under
 * it, which clears within the box so the page below is plain ground.
 */
const WAVE_HEIGHT = 44;
/**
 * How far the pile rises ABOVE the seam's box.
 *
 * The shapes live at negative y, and an SVG clips to its viewBox — an
 * earlier version silently threw away everything above the box. The
 * drawing surface is taller than the seam and hangs upward via a
 * negative margin; the seam's layout box is unchanged.
 *
 * Half the tallest shape above the wave's highest crest, plus tilt
 * headroom — the mirror of GLYPH_FACE's arithmetic below the wave.
 */
const GLYPH_RISE = 52;

/**
 * How far the chamfer cuts in, in real pixels.
 *
 * Real pixels, not a fraction of the width, and this is the whole
 * reason the seam measures its own element. Drawn in a normalised box
 * and stretched, the cut was an 18px nick on a phone and a 66px slope
 * at 1440 — the same instruction rendering as two different shapes,
 * which is exactly the sort of thing that makes a design feel
 * unconsidered without anyone being able to say why. A chamfer is an
 * angle. It keeps its angle.
 */
const CUT = 44;

/** The contact strip: seven pins, as on the real thing. */
const PINS = 7;
const PIN_W = 7;
const PIN_GAP = 5;
const PIN_H = 13;

/** The lit lip. One line, and the only thing every seam has. */
const LIP = 'rgba(255,255,255,0.11)';
/**
 * The pile's one material: a flat mid grey, between the palette's
 * mediumGrey and darkGrey. Light enough to read as objects against
 * both grounds, quiet enough not to fight the section headings above.
 */
const FLAT = '#6B7385';

/**
 * The decorated seam's edge is a wave — a horizon with a swell in it,
 * and the pile rides it. Gentle on purpose: one and a bit crests on a
 * phone, three on a monitor, amplitude a third of the seam's height.
 * The straight seams stay straight; this is the one that plays.
 */
const WAVE_AMP = 9;
const WAVE_MID = 13;
const WAVE_LENGTH = 520;
const WAVE_STEP = 12;

export interface SeamProps {
  /**
   * The colour arriving from below — the incoming section's face.
   * Defaults to the page ground.
   */
  color?: string;
  /**
   * Which seam this is down the page. Even indexes cut the right
   * corner, odd the left.
   */
  index?: number;
  variant?: SeamVariant;
}

export function Seam({
  color = COLORS.navy,
  index = 0,
  variant = 'lip',
}: SeamProps) {
  /**
   * Measured, not asked for.
   *
   * This read `useWindowDimensions()` first, which is wrong in a way
   * that only shows up in the built site: the seams inside a lazy
   * wrapper mounted after layout and got a real width, while the ones
   * rendered eagerly at hydration got 0, clamped to a floor, and never
   * re-rendered — nothing resizes, so nothing told them. Four of nine
   * drew a 320-wide card edge floating in the middle of a 1440 page.
   * Measuring the element itself cannot drift from what is on screen.
   */
  const [W, setW] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    // Only on a real change: setting state to the value it already
    // holds on every layout pass is how a layout loop starts.
    if (measured > 0 && measured !== W) setW(measured);
  };

  const glyphs = variant === 'glyphs';
  const wavy = glyphs || variant === 'wave';
  const height = glyphs
    ? GLYPH_FACE
    : variant === 'wave'
      ? WAVE_HEIGHT
      : variant === 'lip'
        ? LIP_HEIGHT
        : HEIGHT;
  const right = index % 2 === 0;
  // Only the card variant cuts a corner. The lip is a line; the wavy
  // seam's whole top edge is already the special thing.
  const cut = variant === 'card' ? Math.min(CUT, Math.round(W / 7)) : 0;

  /**
   * The wavy edge, as a polyline.
   *
   * A sine sampled every few points — at this amplitude the segments
   * are invisible and the arithmetic stays legible, which matters
   * because the same function has to answer two questions: where the
   * edge is, and where each object's centre sits on it.
   */
  const waveY = (x: number) =>
    WAVE_MID + WAVE_AMP * Math.sin((x / WAVE_LENGTH) * Math.PI * 2 + 0.6);
  let wavePoints = '';
  if (wavy && W > 0) {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += WAVE_STEP)
      pts.push(`${x} ${waveY(x).toFixed(1)}`);
    pts.push(`${W} ${waveY(W).toFixed(1)}`);
    wavePoints = pts.join(' L');
  }

  const face = wavy
    ? `M${wavePoints} V${height} H0 Z`
    : right
      ? `M0 0 H${W - cut} L${W} ${cut} V${height} H0 Z`
      : `M${cut} 0 H${W} V${height} H0 V${cut} Z`;

  // The lit edge rides whatever the top edge is — the flat run and
  // the chamfer's diagonal, or the wave, crest to trough.
  const lipPath = wavy
    ? `M${wavePoints}`
    : right
      ? `M0 1 H${W - cut} L${W} ${cut + 1}`
      : `M${W} 1 H${cut} L0 ${cut + 1}`;

  const strip = PINS * PIN_W + (PINS - 1) * PIN_GAP;
  // On the flat side, a fixed step in from the WINDOW edge. They were
  // inset past the chamfer's width — sixty-two points in, which read
  // as floating rather than as a strip on the card's edge.
  const pinX = right ? 24 : W - 24 - strip;

  /**
   * The pile, riding the wave.
   *
   * Flat light-grey shapes, whole and uncut, each one's centre pinned
   * to the wave at its own position — so the row bobs with the swell
   * instead of standing on a rule. Half of every object is above the
   * edge against one ground and half below it against the other,
   * which only works because the shapes are a third colour: earlier
   * versions tried to play the two near-identical grounds against
   * each other and were invisible. The even-odd rule keeps the disc's
   * spindle and the cartridge's window open, so whichever ground is
   * behind that part of the shape shows straight through.
   *
   * Each shape rotates about its own centre — tilt about a corner
   * swung the big ones off their spot on the wave.
   */
  const rise = glyphs ? GLYPH_RISE : 0;
  const placed = glyphs
    ? W >= SEAM_GLYPH_NARROW
      ? SEAM_SCATTER_WIDE
      : SEAM_SCATTER_NARROW
    : [];
  const scatter = placed.map(({ at, size, tilt }) => {
    const scale = size / GLYPH_BOX;
    const runStart = 26;
    const run = Math.max(W - 52, 1);
    const cx = runStart + at * run;
    const cy = waveY(cx);
    const half = GLYPH_BOX / 2;
    return {
      transform:
        `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${tilt}) ` +
        `scale(${scale.toFixed(3)}) translate(${-half} ${-half})`,
    };
  });

  return (
    <View
      style={[styles.seam, { height }]}
      onLayout={onLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {W > 0 && (
        <Svg
          width="100%"
          height={height + rise}
          viewBox={`0 ${-rise} ${W} ${height + rise}`}
          style={rise > 0 ? svgRise : undefined}
        >
          <Path d={face} fill={color} />

          {/* Depth, on the shoreline only: the same navy darkened just
              under the crest and clear within the box, so the water
              reads deeper than the ground without being another
              colour — the footer's own trick, at the hero's foot. */}
          {variant === 'wave' ? (
            <>
              <Defs>
                <SvgGradient id="seamDepth" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0E1219" stopOpacity="0.42" />
                  <Stop offset="1" stopColor="#0E1219" stopOpacity="0" />
                </SvgGradient>
              </Defs>
              <Path d={face} fill="url(#seamDepth)" />
            </>
          ) : null}

          {/* The line of light, before the pile, so their planted feet
              stand in front of it. */}
          <Path d={lipPath} stroke={LIP} strokeWidth={1.5} fill="none" />

          {/* The pile: flat, whole, standing on the seam. */}
          {scatter.map(({ transform }, i) => (
            <G key={`pile-${i}`} transform={transform}>
              <Path
                d={SEAM_GLYPHS[placed[i].glyph]}
                fill={FLAT}
                fillRule="evenodd"
              />
            </G>
          ))}

          {variant === 'card' &&
            Array.from({ length: PINS }, (_, pin) => (
              <Rect
                key={pin}
                x={pinX + pin * (PIN_W + PIN_GAP)}
                y={Math.round((HEIGHT - PIN_H) / 2) + 1}
                width={PIN_W}
                height={PIN_H}
                rx={2}
                // Dim: a contact strip is a detail you notice on the
                // second scroll, not a row of amber lights.
                fill="rgba(242,169,59,0.34)"
              />
            ))}
        </Svg>
      )}
    </View>
  );
}

/**
 * Pulls the taller drawing surface up so the seam's layout box stays
 * put while the crowns overlap the section above.
 */
const svgRise = { marginTop: -GLYPH_RISE } as const;

const styles = StyleSheet.create({
  seam: {
    width: '100%',
    // The seam belongs to the band below it: it is that band's leading
    // edge, so it must never leave a hairline of page colour under
    // itself when a fractional layout rounds the wrong way.
    marginBottom: -1,
  },
});

export const SEAM_HEIGHT = HEIGHT;
/**
 * A plain seam's height, for the one thing that has to reach over it:
 * a section whose ground begins at its own leading edge rather than
 * below it. Exported so that reach is derived from the seam instead of
 * copied as a number that would quietly stop matching.
 */
export const SEAM_LIP_HEIGHT = LIP_HEIGHT;
