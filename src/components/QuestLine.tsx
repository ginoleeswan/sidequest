import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';

import { animatedSvg } from './animatedSvg';

/**
 * The quest line: the page's scroll, drawn as a path.
 *
 * An app named Sidequest describes itself with a map metaphor and then
 * hands you a landing page that scrolls like any other. This closes
 * that gap. An amber thread runs down the wide gutter beside the
 * column, drawn by your own scrolling — the tip rides just below the
 * middle of the viewport — and a waypoint node lights as you reach each
 * section. Reading the page is walking the path; by the footer the
 * quest is complete. It is the one thing here no template can have,
 * because it is made of this page's own sections.
 *
 * Wide web screens only. On a phone the gutter does not exist, and the
 * phone has its own moments; on native the page is not the front door.
 *
 * The path is generated, not authored, so its length is computed by
 * sampling its own cubics rather than asked of the DOM — the same
 * numbers on every renderer, and nothing to go quietly wrong when a
 * node is not the kind of ref an API expected.
 */

/** A waypoint, planted by the page inside a section. */
export function QuestMark({ id }: { id: string }) {
  if (Platform.OS !== 'web') return null;
  return (
    <View
      // RN-web renders testID as data-testid; this is how the overlay
      // finds the sections without holding refs across files.
      testID={`quest-mark-${id}`}
      style={styles.mark}
      pointerEvents="none"
    />
  );
}

interface Geometry {
  d: string;
  length: number;
  /** [x, y, fraction along the path] for each waypoint node. */
  nodes: [number, number, number][];
  height: number;
  x: number;
}

/** Sampled length of one cubic segment. */
function cubicLength(
  p0: [number, number],
  c1: [number, number],
  c2: [number, number],
  p1: [number, number]
): number {
  let length = 0;
  let last = p0;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const u = 1 - t;
    const x =
      u * u * u * p0[0] +
      3 * u * u * t * c1[0] +
      3 * u * t * t * c2[0] +
      t * t * t * p1[0];
    const y =
      u * u * u * p0[1] +
      3 * u * u * t * c1[1] +
      3 * u * t * t * c2[1] +
      t * t * t * p1[1];
    length += Math.hypot(x - last[0], y - last[1]);
    last = [x, y];
  }
  return length;
}

/** How far the thread wanders from its centre line. */
const SWAY = 26;
/** The gutter must hold the sway plus air on both sides. */
const MIN_GUTTER = 96;

const AnimatedPath = animatedSvg(Path);

export function QuestLine({ measure }: { measure: number }) {
  const reduced = useReducedMotion();
  const host = useRef<View | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const dashoffset = useAnimatedValue(0);
  const [litCount, setLitCount] = useState(0);
  const progressRef = useRef(0);

  // Build the geometry from where the sections actually are, and
  // rebuild whenever the document changes shape under us — images
  // arriving, fonts settling, a resize.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = host.current as unknown as HTMLElement | null;
    if (!node) return;

    const build = () => {
      const rect = node.getBoundingClientRect();
      const gutter = (rect.width - measure) / 2;
      if (gutter < MIN_GUTTER) {
        setGeometry(null);
        return;
      }
      const marks = Array.from(
        document.querySelectorAll('[data-testid^="quest-mark-"]')
      ) as HTMLElement[];
      if (marks.length < 2) return;

      const x = Math.round(gutter / 2);
      const ys = marks
        .map((m) => m.getBoundingClientRect().top - rect.top)
        .sort((a, b) => a - b);

      // A gentle S between consecutive waypoints, swaying alternate
      // sides of the centre line — a trail, not a plumb line.
      const pts: [number, number][] = ys.map((y, i) => [
        x + (i % 2 === 0 ? -SWAY / 2 : SWAY / 2),
        y,
      ]);
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      let length = 0;
      const cumulative = [0];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const mid = (a[1] + b[1]) / 2;
        const c1: [number, number] = [a[0], mid];
        const c2: [number, number] = [b[0], mid];
        d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${b[0]} ${b[1]}`;
        length += cubicLength(a, c1, c2, b);
        cumulative.push(length);
      }
      setGeometry({
        d,
        length,
        nodes: pts.map((p, i) => [p[0], p[1], cumulative[i] / length]),
        height: rect.height,
        x,
      });
    };

    build();
    const observer = new ResizeObserver(build);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  // The scrub: the drawn tip rides just below the viewport's middle.
  useEffect(() => {
    if (Platform.OS !== 'web' || !geometry) return;
    if (reduced) {
      // Less motion: the finished trail, standing still. The lit count
      // for this case is derived at render, not set here.
      dashoffset.setValue(0);
      return;
    }
    const node = host.current as unknown as HTMLElement | null;
    if (!node) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        const tip = window.innerHeight * 0.6 - rect.top;
        const first = geometry.nodes[0][1];
        const last = geometry.nodes[geometry.nodes.length - 1][1];
        const progress = Math.min(
          Math.max((tip - first) / (last - first), 0),
          1
        );
        progressRef.current = progress;
        dashoffset.setValue(geometry.length * (1 - progress));
        const lit = geometry.nodes.filter((n) => progress >= n[2]).length;
        setLitCount((current) => (current === lit ? current : lit));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [geometry, reduced, dashoffset]);

  if (Platform.OS !== 'web') return null;

  // Under reduced motion every node reads as reached — derived rather
  // than set from the effect, which is what the compiler asks and also
  // simply true: there is no journey to be partway through.
  const lit = reduced && geometry ? geometry.nodes.length : litCount;

  return (
    <View
      ref={host}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      // The overlay itself, findable by the tests that watch it move.
      testID="quest-line"
    >
      {geometry && (
        <Svg
          width={geometry.x + SWAY * 2}
          height={geometry.height}
          style={styles.svg}
        >
          {/* The road not yet walked: the whole trail, faint. */}
          <Path
            d={geometry.d}
            stroke={COLORS.strokeStrong}
            strokeWidth={2}
            strokeDasharray="2 7"
            strokeLinecap="round"
            fill="none"
          />
          {/* The part you have walked, drawn by the scroll. */}
          <AnimatedPath
            d={geometry.d}
            stroke={COLORS.accent}
            strokeWidth={2}
            strokeDasharray={`${geometry.length}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
          {geometry.nodes.map(([x, y, fraction], index) => (
            <Circle
              key={fraction}
              cx={x}
              cy={y}
              r={index < lit ? 5 : 3.5}
              fill={index < lit ? COLORS.accent : COLORS.navy}
              stroke={index < lit ? COLORS.accent : COLORS.strokeStrong}
              strokeWidth={2}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 1, height: 1 },
  svg: { position: 'absolute', top: 0, left: 0 },
});
