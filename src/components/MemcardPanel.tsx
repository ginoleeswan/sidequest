import { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { RADIUS } from '@/styles/theme';

/**
 * The memory-card silhouette, as a container anything can sit in.
 *
 * The shape was drawn once, inside `LandingMemcard`, for the one object
 * that is literally a memory card. It is also the page's strongest piece
 * of brand furniture — a rounded panel with one corner cut off on the
 * diagonal and four grip grooves beside the cut — and the seams already
 * borrow it as a divider. Anything on this page that wants to read as
 * the app's own hardware rather than as a web card wants this outline,
 * and copying the path to get it is how two silhouettes drift apart.
 *
 * So the path lives here and takes children. `LandingMemcard` keeps its
 * own drawing, because it is not a container: its shell is sized by an
 * arithmetic of slots and rows and has a header measured against the
 * same numbers. This is for the ordinary case — a panel that is as big
 * as whatever is inside it.
 */

/** Where the cut corner starts, clamped so it is a chamfer at any size. */
const notchFor = (width: number) => Math.max(30, Math.min(52, width * 0.055));

/**
 * The outline: rounded everywhere except the top right, which is cut
 * off on the diagonal. That one cut is the whole silhouette — it is
 * what makes the shape read as saved progress rather than as a panel.
 */
export function memcardShellPath(w: number, h: number, notch: number): string {
  const r = 18;
  return (
    `M ${r} 0 H ${w - notch} L ${w} ${notch} V ${h - r} ` +
    `Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} ` +
    `V ${r} Q 0 0 ${r} 0 Z`
  );
}

export function MemcardPanel({
  children,
  style,
  /** The panel's surface. Matches the card's own shell by default. */
  fill = '#1D2431',
  contentStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fill?: string;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  /**
   * Measured, because an SVG needs real numbers and this panel's size
   * is whatever its contents come to. A viewBox scaled to fit would be
   * the alternative and would skew the chamfer — the cut is a fixed
   * distance in points, not a fraction of the panel, or it turns into a
   * shallow nick on a wide one and a bevelled corner on a narrow one.
   */
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = { width: Math.round(width), height: Math.round(height) };
    if (next.width !== size.width || next.height !== size.height) setSize(next);
  };

  const drawn = size.width > 0 && size.height > 0;

  return (
    <View
      onLayout={onLayout}
      /**
       * The surface is painted by the View until the shell exists, and
       * by the shell after. Both at once would show a square corner
       * through the cut — the fallback filling in exactly the piece the
       * silhouette is defined by.
       */
      style={[styles.panel, !drawn && { backgroundColor: fill }, style]}
    >
      {drawn ? (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={memcardShellPath(size.width, size.height, notchFor(size.width))}
            fill={fill}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={2}
          />
          {/* The grip grooves, beside the cut corner — the detail that
              stops the chamfer reading as a clipped rectangle. */}
          {[0, 1, 2, 3].map((slot) => (
            <Rect
              key={slot}
              x={size.width - notchFor(size.width) - 22 - slot * 13}
              y={10}
              width={5}
              height={16}
              rx={2.5}
              fill="rgba(255,255,255,0.10)"
            />
          ))}
        </Svg>
      ) : null}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * No box shadow. The View is a rectangle and the shell is not — a
   * rect shadow ghosts through the notch as a dark corner floating
   * behind the cut, which is the exact bug `LandingMemcard` records
   * having hit on every band it sat on.
   */
  panel: { borderRadius: RADIUS.md },
});
