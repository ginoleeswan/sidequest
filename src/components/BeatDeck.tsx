import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { LandingProof } from './LandingProof';
import { QuestMark } from './QuestLine';
import { Rise } from './Rise';
import { Words } from './Words';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import {
  LANDING_MEASURE,
  LANDING_WELL,
  type LandingScale,
} from '@/styles/landing';
import { GUTTER, RADIUS, SPACING } from '@/styles/theme';

/**
 * The three beats, as a deck of full-bleed panels.
 *
 * They were three rows in one band, divided by hairlines and read by
 * scrolling past them — accurate, and the flattest stretch of the
 * page: three paragraphs wearing evidence. A deck states the same
 * argument the way Phantom's landing page states its features: one
 * idea per panel, each panel a big rounded card in its own colour,
 * the next one peeking in from the edge so the hand knows what to do
 * before the eye finds the arrows.
 *
 * Three things keep it honest rather than fashionable. Every panel
 * still carries the app's REAL evidence — the same staged proof cards,
 * fed live data, that the rows carried. The deck is swipe-first but
 * never swipe-only: the header's arrows drive it too, so a trackpad,
 * a keyboard user tabbing to the buttons, and a thumb all have a way
 * through, and the panels sit in normal page flow for anyone who
 * never touches it — nothing on the page exists only behind a
 * gesture. And each beat keeps its colour: the panel's ground, its
 * numeral and its evidence all speak the beat's own hue, so the deck
 * reads as three places, not three copies of one card.
 */

const BEATS = [
  {
    kind: 'length' as const,
    hue: COLORS.accent,
    lead: 'It knows how long things take.',
    body: 'Real lengths from players who finished, on every tile — before you tap.',
  },
  {
    kind: 'tonight' as const,
    hue: COLORS.violet,
    lead: 'It picks what fits tonight.',
    body: 'A Tuesday is not a Saturday. It does the arithmetic and names one game.',
  },
  {
    kind: 'drop' as const,
    hue: COLORS.coral,
    lead: 'It lets you put things down.',
    body: 'Most of the pile will never be played. Saying so is the fun part.',
  },
];

/** The next panel's visible sliver — the deck's whole affordance. */
const PEEK = 36;
const GAP = SPACING.md;
const PAD = SPACING.lg + 4;

export function BeatDeck({
  scale,
  games,
}: {
  scale: LandingScale;
  games?: Game[];
}) {
  const rail = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  /**
   * Measured, not asked for — the same lesson the seams learned.
   * `useWindowDimensions` answered with the static render's width at
   * hydration and never corrected itself, and the deck built 510pt
   * panels on a 390pt phone. The element cannot be wrong about its
   * own width.
   */
  const [width, setWidth] = useState(
    // A first guess so the deck exists before layout: the static
    // export and the test renderer never fire onLayout, and a deck
    // gated on it shipped pre-rendered HTML with no beats in it at
    // all — the page's whole argument missing from its own source.
    () => Dimensions.get('window').width || 390
  );
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== width) setWidth(measured);
  };

  // Panels start on the measured column's left edge and run toward the
  // window's, like every other full-bleed rail on the page.
  const inset = Math.max(
    scale.inset,
    (width - LANDING_MEASURE) / 2 + scale.inset
  );
  const panelW = scale.wide
    ? Math.min(640, width - inset * 2 - PEEK)
    : width - inset - PEEK - GUTTER;
  const step = panelW + GAP;

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(BEATS.length - 1, index));
    rail.current?.scrollTo({ x: clamped * step, animated: true });
    setActive(clamped);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / step);
    if (index !== active && index >= 0 && index < BEATS.length)
      setActive(index);
  };

  return (
    <View onLayout={onLayout}>
      <View style={[styles.head, { paddingHorizontal: inset }]}>
        <QuestMark id="beats" />
        {/* The deck's nameplate: a solid white chip, the one high-key
            object in the section, so the eye lands here first and the
            arrows beside it explain themselves. */}
        <Rise from="mask">
          <View style={styles.chip}>
            <Ionicons name="game-controller" size={16} color={COLORS.navy} />
            <Text style={styles.chipWord}>HOW IT WORKS</Text>
          </View>
        </Rise>
        <View style={styles.arrows}>
          <Pressable
            onPress={() => goTo(active - 1)}
            disabled={active === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            style={[styles.arrow, active === 0 && styles.arrowIdle]}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.lightGrey} />
          </Pressable>
          <Pressable
            onPress={() => goTo(active + 1)}
            disabled={active === BEATS.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next step"
            style={[
              styles.arrow,
              active === BEATS.length - 1 && styles.arrowIdle,
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={rail}
        horizontal
        // Keyboard access for the one scrollable region on the page
        // that is not the page: focusable puts it in the tab order,
        // and the arrow buttons above already drive it for anyone who
        // cannot swipe. axe flags the region without this, and axe is
        // right.
        focusable
        accessibilityLabel="How it works, three steps"
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.railRoom}
        contentContainerStyle={[
          styles.railContent,
          { paddingHorizontal: inset },
        ]}
      >
        {BEATS.map((beat, index) => (
          <View
            key={beat.kind}
            style={[
              styles.panel,
              {
                width: panelW,
                borderColor: `${beat.hue}4D`,
              },
            ]}
          >
            {/* The tint is a wash over the well, not a colour of its
                own — the beats stay rooms in the same house. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: `${beat.hue}14` },
              ]}
              pointerEvents="none"
            />
            <View style={styles.panelHead}>
              <Text style={[styles.index, { color: beat.hue }]}>
                {`0${index + 1}`}
              </Text>
              <Words
                text={beat.lead}
                style={[styles.lead, scale.leadColumn]}
                delay={60}
              />
              <Text style={[styles.body, scale.body]}>{beat.body}</Text>
            </View>
            <View testID={`beat-proof-${index}`}>
              <Rise from="lift" delay={160}>
                <LandingProof
                  kind={beat.kind}
                  game={games?.[index + 2]}
                  width={panelW - PAD * 2}
                  hue={beat.hue}
                />
              </Rise>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Where you are in the argument, in the argument's colours. */}
      <View style={styles.dots}>
        {BEATS.map((beat, index) => (
          <View
            key={beat.kind}
            style={[
              styles.dot,
              index === active && { backgroundColor: beat.hue, width: 22 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: LANDING_MEASURE,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  chipWord: {
    fontFamily: 'Noah-Black',
    fontSize: 13,
    letterSpacing: 1.5,
    color: COLORS.navy,
  },
  arrows: { flexDirection: 'row', gap: SPACING.sm },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIdle: { opacity: 0.35 },
  /**
   * Shadow room, the Rail trick: a horizontal scroller clips at its
   * own box, so the panels' drop shadows need padding inside it and
   * negative margins outside to hand the space back to the layout.
   */
  railRoom: { marginVertical: -40 },
  railContent: { gap: GAP, paddingVertical: 40 },
  panel: {
    backgroundColor: LANDING_WELL,
    borderRadius: RADIUS.lg - 2,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: PAD,
    gap: SPACING.lg,
    // Tight enough to fit inside the rail's shadow room with margin:
    // the first cut of this shadow blurred 44 points into a 24-point
    // room and the clip edge read as a background change under the
    // panels, right where the dots sit.
    boxShadow: '0 10px 24px rgba(9,12,19,0.38)',
  },
  panelHead: { gap: SPACING.sm },
  index: {
    fontFamily: 'Noah-Black',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
  lead: { color: COLORS.white },
  body: { color: COLORS.mediumGrey, maxWidth: 460 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
