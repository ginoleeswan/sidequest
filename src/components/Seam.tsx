import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { COLORS } from '@/styles/colors';

/**
 * The edge between two sections, drawn as the edge of a memory card.
 *
 * Every band on this page used to meet the next one at a flat colour
 * change. That is a divider, not a design: it says "this stopped and
 * that started" and nothing else, and on a page whose one memorable
 * object is a memory card it says it in a vocabulary the page does not
 * otherwise speak.
 *
 * A memory card has three edges worth stealing, and this uses all
 * three. The **chamfer** — one corner cut on the diagonal — is the
 * silhouette that makes the card read as saved progress rather than as
 * a widget; here it makes each section read as a card sliding in over
 * the last. The **contact pins** are the gold connector strip along a
 * cartridge's leading edge, and they sit on the side the chamfer is
 * not, so the seam is asymmetric and has a direction. The **highlight**
 * is a one-pixel line along the top of the incoming card, which is the
 * whole difference between two colours meeting and one surface lying
 * over another.
 *
 * The chamfer alternates down the page, so consecutive seams read as
 * cards stacked from alternating sides rather than as a repeated
 * ornament. Pass `index`; it does the rest.
 *
 * Purely decorative, so it is hidden from assistive technology
 * entirely — a screen reader announcing "image" between every section
 * is a worse page, not a more accessible one.
 */

/** How tall the incoming card's leading edge is. */
const HEIGHT = 34;
/**
 * How far the chamfer cuts in, in real pixels.
 *
 * Real pixels, not a fraction of the width, and this is the whole
 * reason the seam measures the viewport. Drawn in a normalised box and
 * stretched, the cut was an 18px nick on a phone and a 66px slope at
 * 1440 — the same instruction rendering as two different shapes, which
 * is exactly the sort of thing that makes a design feel unconsidered
 * without anyone being able to say why. A chamfer is an angle. It keeps
 * its angle.
 */
const CUT = 44;

/** The contact strip: seven pins, as on the real thing. */
const PINS = 7;
const PIN_W = 7;
const PIN_GAP = 5;
const PIN_H = 13;

export interface SeamProps {
  /**
   * The colour arriving from below — the incoming card's face. Defaults
   * to the page ground.
   */
  color?: string;
  /** The colour above, which the chamfer cuts away to reveal. */
  behind?: string;
  /**
   * Which seam this is down the page. Even indexes cut the right
   * corner, odd the left.
   */
  index?: number;
  /**
   * Turn the pins off. Worth doing where something else already sits on
   * the seam — the pins and a logo on the same lip is two ideas.
   */
  pins?: boolean;
}

export function Seam({
  color = COLORS.navy,
  behind = 'transparent',
  index = 0,
  pins = true,
}: SeamProps) {
  /**
   * Measured, not asked for.
   *
   * This read `useWindowDimensions()` first, which is wrong in a way
   * that only shows up in the built site: the seams inside a lazy
   * wrapper mounted after layout and got a real width, while the four
   * rendered eagerly at hydration got 0, clamped to the 320 floor, and
   * never re-rendered — nothing resizes, so nothing told them. Four of
   * nine seams drew a 320-wide card edge floating in the middle of a
   * 1440 page. Measuring the element itself cannot drift from what is
   * actually on screen, and it keeps working if this is ever used
   * somewhere that is not full-bleed.
   */
  const [W, setW] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    // Only on a real change: setting state to the value it already
    // holds on every layout pass is how a layout loop starts.
    if (measured > 0 && measured !== W) setW(measured);
  };
  const right = index % 2 === 0;
  // Never more than a seventh of the screen: at 320 a 44px cut is a
  // corner, and at 1440 it is a detail. Both are right.
  const cut = Math.min(CUT, Math.round(W / 7));

  const face = right
    ? `M0 0 H${W - cut} L${W} ${cut} V${HEIGHT} H0 Z`
    : `M${cut} 0 H${W} V${HEIGHT} H0 V${cut} Z`;

  // The lit edge follows only the flat part of the top, then rides the
  // diagonal down. Light catches a lip; it does not catch the void the
  // chamfer opens up.
  const lip = right
    ? `M0 1 H${W - cut} L${W} ${cut + 1}`
    : `M${W} 1 H${cut} L0 ${cut + 1}`;

  const strip = PINS * PIN_W + (PINS - 1) * PIN_GAP;
  // On the flat side, inset a card's own corner radius past the
  // chamfer so the pins and the cut never crowd each other.
  const pinX = right ? cut + 18 : W - cut - 18 - strip;

  return (
    <View
      style={[styles.seam, { backgroundColor: behind }]}
      onLayout={onLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {W > 0 && (
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${W} ${HEIGHT}`}>
          <Path d={face} fill={color} />
          <Path
            d={lip}
            stroke="rgba(255,255,255,0.11)"
            strokeWidth={1.5}
            fill="none"
          />
          {pins &&
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

const styles = StyleSheet.create({
  seam: {
    width: '100%',
    height: HEIGHT,
    // The seam belongs to the band below it: it is that band's leading
    // edge, so it must never leave a hairline of page colour under
    // itself when a fractional layout rounds the wrong way.
    marginBottom: -1,
  },
});

export const SEAM_HEIGHT = HEIGHT;
