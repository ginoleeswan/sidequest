import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

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

export type SeamVariant = 'lip' | 'card' | 'glyphs';

/** How tall a card edge is. */
const HEIGHT = 34;
/** A plain lip needs no body — only the line and a little air under it. */
const LIP_HEIGHT = 18;
/**
 * How far the skyline rises ABOVE the seam's box.
 *
 * The crowns live at negative y, and an SVG clips to its viewBox — an
 * earlier version drew exactly the half below the line and silently
 * threw the rest away. So the drawing surface is taller than the seam
 * and hangs upward into the section above via a negative margin; the
 * seam's layout box is unchanged, which is what lets the objects
 * overlap the outgoing section the way the memcard overlaps its band.
 *
 * Just past the tallest crown: the 76pt hero sitting 0.38 deep leaves
 * 47pt exposed.
 */
const GLYPH_RISE = 50;

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
 * The same light on the skyline's crowns, caught a little harder — a
 * curved crown faces the light more directly than a flat edge, and at
 * the lip's own strength a short curved stroke simply vanished.
 */
const CROWN = 'rgba(255,255,255,0.34)';
/**
 * The silhouettes' body: the app's shadow tone, not the band's colour.
 *
 * The first pass filled them with the band itself so the bases would
 * merge invisibly — principled, and invisible all over: the two bands
 * this seam sits between are nine RGB units apart, so a band-coloured
 * shape against the other band simply is not there, and all that
 * survived was a row of hairline outlines hovering near a line. An
 * object resting on a lit edge at dusk is DARKER than both grounds —
 * it is in its own shadow. One deep tone, the same family as every
 * other shadow in the app, makes the shapes solid against the section
 * above and leaves a quiet planted base visible below the line, which
 * reads as the slot it is sitting in.
 */
const SILHOUETTE = '#151B27';

export interface SeamProps {
  /**
   * The colour arriving from below — the incoming section's face.
   * Defaults to the page ground.
   */
  color?: string;
  /** The colour above, which the chamfer cuts away to reveal. */
  behind?: string;
  /**
   * Which seam this is down the page. Even indexes cut the right
   * corner, odd the left.
   */
  index?: number;
  variant?: SeamVariant;
}

export function Seam({
  color = COLORS.navy,
  behind = 'transparent',
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
  // The skyline seam is a card edge — same height, same chamfer. Its
  // extra room is above the line, not below it.
  const height = variant === 'lip' ? LIP_HEIGHT : HEIGHT;
  const right = index % 2 === 0;
  // A plain lip has no corner to cut: it is a line, not an object.
  const cut = variant === 'lip' ? 0 : Math.min(CUT, Math.round(W / 7));

  const face = right
    ? `M0 0 H${W - cut} L${W} ${cut} V${height} H0 Z`
    : `M${cut} 0 H${W} V${height} H0 V${cut} Z`;

  // The lit edge follows the flat part of the top, then rides the
  // diagonal down. Light catches a lip; it does not catch the void the
  // chamfer opens up.
  const lipPath = right
    ? `M0 1 H${W - cut} L${W} ${cut + 1}`
    : `M${W} 1 H${cut} L0 ${cut + 1}`;

  const strip = PINS * PIN_W + (PINS - 1) * PIN_GAP;
  // On the flat side, inset a corner radius past the chamfer so the
  // pins and the cut never crowd each other.
  const pinX = right ? cut + 18 : W - cut - 18 - strip;

  /**
   * The skyline.
   *
   * The pile's belongings sit on the lit edge the way the Mark sits on
   * the horizon at the foot of this same page — dark shapes on a line
   * of light. Three decisions carry the whole thing:
   *
   * Solid, in shadow. Each object is one deep tone against both
   * grounds — darker than the sky above the line and darker than the
   * card below it, the way a thing on a lit edge at dusk is darker
   * than everything behind it. The even-odd rule keeps the disc's
   * spindle and the cartridge's window open, and through them you see
   * whichever section is behind that part of the shape — the one
   * genuine piece of negative space, spent where it is legible.
   *
   * The lip hides behind them. The line of light is drawn first and
   * the silhouettes over it, so it reads as passing behind each object
   * — which is how an edge and a thing resting on it actually occlude.
   *
   * The light only catches the crowns. Each outline is stroked in the
   * lip's own white, clipped to above the line: the same light that
   * makes every other seam makes this one, just interrupted by what is
   * sitting on it. Below the line there is no stroke at all — a line
   * around the base would cut the object back off the card.
   */
  const rise = glyphs ? GLYPH_RISE : 0;
  const crownClip = `seam-crowns-${index}`;
  const placed = glyphs
    ? W >= SEAM_GLYPH_NARROW
      ? SEAM_SCATTER_WIDE
      : SEAM_SCATTER_NARROW
    : [];
  const scatter = placed.map(({ at, size, sit, tilt }) => {
    const scale = size / GLYPH_BOX;
    // Centres spread along the flat run only — never the chamfer,
    // which would cut an object twice and read as a mistake.
    const runStart = right ? 26 : cut + 26;
    const run = Math.max(W - cut - 52, 1);
    const x = runStart + at * run - size / 2;
    // `sit` of the object below the line, the rest above it.
    const y = -(1 - sit) * size;
    return {
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt}) scale(${scale.toFixed(3)})`,
      // One constant visual weight: a hairline scaled with a 24pt
      // object and a 46pt one is two different hairlines.
      stroke: 1.5 / scale,
    };
  });

  return (
    <View
      style={[styles.seam, { height, backgroundColor: behind }]}
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
          {glyphs && (
            <Defs>
              {/* Above the line only: where the light is allowed. */}
              <ClipPath id={crownClip}>
                <Rect x={0} y={-rise} width={W} height={rise + 1.5} />
              </ClipPath>
            </Defs>
          )}

          <Path d={face} fill={color} />

          {/* The line of light, before the skyline, so it passes
              behind each object rather than through it. */}
          <Path d={lipPath} stroke={LIP} strokeWidth={1.5} fill="none" />

          {/* The silhouettes, in the band's own colour: bases merge
              into the card, crowns rise into the section above. */}
          {scatter.map(({ transform }, i) => (
            <G key={`shape-${i}`} transform={transform}>
              <Path
                d={SEAM_GLYPHS[placed[i].glyph]}
                fill={SILHOUETTE}
                fillRule="evenodd"
              />
            </G>
          ))}

          {/* The light catching the crowns — and nothing below. */}
          {glyphs && (
            <G clipPath={`url(#${crownClip})`}>
              {scatter.map(({ transform, stroke }, i) => (
                <G key={`crown-${i}`} transform={transform}>
                  <Path
                    d={SEAM_GLYPHS[placed[i].glyph]}
                    fill="none"
                    stroke={CROWN}
                    strokeWidth={stroke}
                    strokeLinejoin="round"
                  />
                </G>
              ))}
            </G>
          )}

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
