import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useState } from 'react';
import {
  useWindowDimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mark } from './Mark';
import { COLORS } from '@/styles/colors';
import { LANDING_WELL } from '@/styles/landing';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const EXPLORE = [
  { label: 'Home', href: '/' },
  { label: 'My Library', href: '/library' },
  { label: 'The Plan', href: '/plan' },
] as const;

const LEGAL = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
] as const;

function LinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <View style={styles.col}>
      <Text style={styles.colHeading}>{heading}</Text>
      {links.map((link) => (
        <Pressable
          key={link.href}
          onPress={() => router.push(link.href)}
          accessibilityRole="link"
        >
          <Text style={styles.link}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The shoreline: the footer's leading edge, as a wave.
 *
 * The page's decorated seam taught the footer its trick. The band used
 * to arrive on a sixty-four point gradient and a hairline — a fade,
 * which is what a transition looks like when nobody drew one. Now the
 * footer is a body of deeper water and the page meets it at a drawn
 * waterline: the same gentle swell as the pile's seam, one lit lip
 * along the crest, and the Mark bobbing behind it — in the water, not
 * on a label — the way Duolingo's owl peeks over the hill into their
 * footer. The mascot sits out on the landing page, where the horizon
 * section above has already given the Mark its real scene.
 */
const SHORE_H = 64;
const SHORE_AMP = 10;
const SHORE_MID = 30;
const SHORE_LENGTH = 560;

function Shore({ mascot }: { mascot: boolean }) {
  const [W, setW] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== W) setW(measured);
  };
  const waveY = (x: number) =>
    SHORE_MID + SHORE_AMP * Math.sin((x / SHORE_LENGTH) * Math.PI * 2 + 2.1);
  let wave = '';
  if (W > 0) {
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 12) pts.push(`${x} ${waveY(x).toFixed(1)}`);
    pts.push(`${W} ${waveY(W).toFixed(1)}`);
    wave = pts.join(' L');
  }
  // Two thirds along, clear of both the watermark's corner and the
  // brand block below.
  const markX = Math.round(W * 0.68);

  return (
    <View style={styles.shore} onLayout={onLayout} pointerEvents="none">
      {W > 0 && (
        <>
          {/* Behind the water on purpose: the wave is drawn after and
              covers the Mark's base, so it peeks over the line. */}
          {mascot && (
            <View
              style={[styles.bob, { left: markX - 16, top: waveY(markX) - 24 }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Mark size={32} />
            </View>
          )}
          <Svg width="100%" height={SHORE_H} viewBox={`0 0 ${W} ${SHORE_H}`}>
            <Path d={`M${wave} V${SHORE_H} H0 Z`} fill={LANDING_WELL} />
            <Path
              d={`M${wave}`}
              stroke="rgba(255,255,255,0.11)"
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
        </>
      )}
    </View>
  );
}

/**
 * The contact strip, one last time.
 *
 * The landing page's chapter seams carry a memory card's gold pins on
 * their leading edge; the footer carries the same strip at the END of
 * the page — the card's connector, where the thing plugs in. It is
 * the only ornament the footer gets, which is what lets it read as a
 * signature rather than a decoration.
 */
function Pins() {
  const PIN_W = 6;
  const PIN_H = 11;
  const GAP = 4;
  const COUNT = 7;
  const width = COUNT * PIN_W + (COUNT - 1) * GAP;
  return (
    <Svg width={width} height={PIN_H} accessibilityElementsHidden>
      {Array.from({ length: COUNT }, (_, pin) => (
        <Rect
          key={pin}
          x={pin * (PIN_W + GAP)}
          y={0}
          width={PIN_W}
          height={PIN_H}
          rx={1.5}
          fill="rgba(242,169,59,0.38)"
        />
      ))}
    </Svg>
  );
}

interface Props {
  /**
   * The parent's horizontal padding. The band bleeds across it with
   * negative margins so the footer runs edge to edge, matching how Rail
   * escapes padded containers.
   */
  inset?: number;
  /**
   * Where the footer's own content sits, so it lines up with the page
   * above it.
   *
   * Separate from `inset` because the two are not the same number and
   * assuming they were put every word in this band twenty pixels off:
   * a page that pads each section rather than its scroller has nothing
   * for the band to bleed across, so the negative margin pulled it wide
   * of the screen and the right-hand fine print ran off the edge.
   */
  pad?: number;
  /**
   * The Mark bobbing behind the waterline. Off on the landing page,
   * whose horizon section already gives the Mark its real scene.
   */
  mascot?: boolean;
}

/**
 * The page's terminus. A flat, grain-free band whose colour matches the
 * html canvas exactly — so wherever iOS Safari paints past the end of the
 * document (under the toolbar, during overscroll), it reads as the footer
 * continuing rather than the texture falling off a cliff. The grain ends
 * on purpose, at the hairline.
 */
export function SiteFooter({
  inset = 0,
  pad = SPACING.lg,
  mascot = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  /**
   * The ghost wordmark, sized to its stage. Fixed at 128 it overflowed
   * a phone and the visible tail read as a different product name; the
   * whole word spanning the band is the design, at every width.
   */
  const ghost = Math.round(Math.min(Math.max(width * 0.155, 54), 128));

  return (
    <View style={inset > 0 ? { marginHorizontal: -inset } : undefined}>
      <Shore mascot={mascot} />
      <View
        style={[styles.band, { paddingBottom: insets.bottom + SPACING.lg }]}
      >
        <Text
          style={[styles.watermark, { fontSize: ghost }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          SIDEQUEST
        </Text>
        <View style={[styles.inner, { paddingHorizontal: pad }]}>
          <Pins />
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <View style={styles.lockup}>
                <Mark size={26} />
                <Text style={styles.wordmark}>Sidequest</Text>
              </View>
              {/* The claim, said at claim size. As a label under the
                  wordmark it was furniture; the footer is the last
                  thing a reader sees, and it should leave saying the
                  one sentence the product stands on. */}
              <Text style={styles.tagline}>
                Know what you can{'\n'}actually finish.
              </Text>
              <Text style={styles.pitch}>
                Backlog triage for people with more games than time. No account,
                no tracking — your library lives on this device.
              </Text>
              {/* The page that makes the case for the product was filed
                under Legal, between the terms and the privacy policy.
                It belongs with the sentence it expands on. */}
              <Pressable
                onPress={() => router.push('/about')}
                accessibilityRole="link"
              >
                <Text style={styles.pitchLink}>What Sidequest is →</Text>
              </Pressable>
            </View>
            <View style={styles.cols}>
              <LinkColumn heading="Explore" links={EXPLORE} />
              <LinkColumn heading="Legal" links={LEGAL} />
            </View>
          </View>

          <View style={styles.rule} />

          <View style={styles.bottomRow}>
            <Text style={styles.fineprint}>Game data by RAWG · IGDB</Text>
            <Text style={styles.fineprint}>Built for the backlog</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shore: { height: SHORE_H, marginBottom: -1 },
  bob: { position: 'absolute' },
  band: {
    marginTop: 'auto',
    // The well tone, one step below the page: the footer is deeper
    // water, which is what lets its waterline read on pages whose own
    // ground is the same navy the footer used to share.
    backgroundColor: LANDING_WELL,
    overflow: 'hidden',
  },
  // A ghost of the wordmark, barely-there, anchoring the band's depth
  // without a single gradient.
  watermark: {
    position: 'absolute',
    right: -8,
    bottom: -26,
    fontFamily: 'Noah-Black',
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.028)',
  },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    // A terminus gets to breathe: this is the page's last block, and
    // cramped final margins read as running out of paper.
    paddingTop: SPACING.xl + 8,
    gap: SPACING.xl,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.xl,
    columnGap: SPACING.xl * 2,
  },
  brand: { gap: SPACING.sm + 2, maxWidth: 380 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 20,
    letterSpacing: 0.5,
    color: COLORS.white,
  },
  tagline: {
    fontFamily: 'Noah-Black',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: COLORS.lightGrey,
    marginTop: SPACING.xs,
  },
  pitchLink: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    marginTop: SPACING.sm + 2,
  },
  pitch: {
    ...TYPE.caption,
    lineHeight: 20,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xs,
    maxWidth: 340,
  },
  cols: {
    flexDirection: 'row',
    columnGap: SPACING.xl * 2,
    rowGap: SPACING.lg,
    flexWrap: 'wrap',
  },
  col: { gap: SPACING.sm + 4, minWidth: 104 },
  colHeading: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.xs,
  },
  link: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  rule: { height: 1, backgroundColor: COLORS.stroke },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  fineprint: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    opacity: 0.85,
  },
});
