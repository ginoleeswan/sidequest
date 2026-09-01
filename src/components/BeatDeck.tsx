import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { Rise } from './Rise';
import { SEAM_LIP_HEIGHT } from './Seam';
import { Words } from './Words';
import type { Game } from '@/api/types';
import { beatAnchor, beatIndexAt, beatStops } from '@/lib/beatDeck';
import { COLORS } from '@/styles/colors';
import { EASING } from '@/styles/motion';
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

/**
 * How strongly each beat's colour washes the section when it is the
 * one being read. Low: this is the room's light changing, not the room
 * being repainted, and the panels carry the beat's real colour already.
 */
const WASH = 0.055;

/** The next panel's visible sliver — the deck's whole affordance. */
const PEEK = 36;
const GAP = SPACING.md;
const PAD = SPACING.lg + 4;

/**
 * Where the rail rests and where it travels, once and for the module —
 * the beats are a constant, so the schedule derived from them is too.
 * See `lib/beatDeck` for what the shape of it is doing.
 */
const STOPS = beatStops(BEATS.length);

/**
 * How much of the track the deck spends dealing itself out.
 *
 * Inside the schedule's own arrival hold (`BEAT_ARRIVE`, 0.16), and
 * deliberately: the rail must not begin walking while the panels are
 * still finding their places, or the spread and the first transition
 * run over each other and neither reads. The small remainder is a beat
 * of stillness between the two.
 */
const SPREAD_ENDS_AT = 0.12;

/** How much of a stacked card shows past the one in front of it. */
const STACK_PEEK = 16;
/** And how far it sits below, and how much smaller. A held deck. */
const STACK_DROP = 12;
const STACK_SHRINK = 0.05;

/**
 * The room's light, painted behind the whole pinned track.
 *
 * It used to live inside the deck, and inside the deck it was inside
 * the stage, which clips vertically — so the colour could only ever
 * begin where the pinned window began. On the way into the section
 * that put the tint's top edge below the seam rather than at it, and
 * once pinned it left the bottom of the screen untinted, because the
 * wash was sized off the deck's own box rather than off the section's.
 *
 * As a track backdrop it is sized by the section instead: from the top
 * of the seam that opens it to the seam that closes it, so the light
 * starts exactly where the room does.
 *
 * Crossfaded solid layers, not an interpolated `backgroundColor`:
 * animating a colour is a JS-driven repaint of a full-bleed box on
 * every frame, where opacity stays on the native driver. Each beat's
 * wash is flat while that beat is held and crosses to the next one
 * while the rail travels, so the light changes exactly when the
 * argument does.
 */
export function BeatWash({ progress }: { progress: Animated.Value }) {
  return (
    <View style={styles.wash} pointerEvents="none">
      {BEATS.map((beat, index) => (
        <Animated.View
          key={`wash-${beat.kind}`}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: progress.interpolate({
                inputRange: STOPS.input,
                outputRange: STOPS.output.map((at) =>
                  at === index ? WASH : 0
                ),
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          {/* A flat, even wash — deliberately.
              Gradient versions of this were tried twice: feathered top
              and bottom, then two crossed falloffs meant to bloom from
              behind the card. Both looked more designed in the abstract
              and worse on the page. At a twentieth of an alpha the
              colour is barely there, and shaping something that faint
              just makes it uneven — you stop reading it as the room's
              light and start seeing the shape of the gradient. */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: beat.hue }]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export function BeatDeck({
  scale,
  games,
  progress,
  onSeek,
}: {
  scale: LandingScale;
  games?: Game[];
  /**
   * Scroll position through a pinned section, 0 to 1, mapped across the
   * three beats. Given one, the deck stops being a thing you swipe and
   * becomes a thing the page plays: the rail is driven by the reader's
   * vertical scroll and the ground crossfades to each beat's hue.
   *
   * Without one it is exactly the deck it has always been. That is what
   * native, reduced motion and short viewports get, and it is why the
   * horizontal ScrollView below is still here rather than replaced.
   */
  progress?: Animated.Value;
  /**
   * Scroll the page to a fraction of the pinned section. Supplied by the
   * stage, which is the only thing that knows where its track sits.
   */
  onSeek?: (fraction: number) => void;
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

  /**
   * The last beat's index — the deck's travel is measured in gaps
   * between beats, not in beats, so three panels are two steps apart.
   */
  const LAST = BEATS.length - 1;

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(LAST, index));
    if (progress) {
      // Driven by the page, so the arrows must move the PAGE. Scrolling
      // the rail would fight the thing that owns its position, and the
      // next scroll frame would snap it straight back. This keeps the
      // buttons working — the deck is swipe-first but never swipe-only,
      // and a pinned deck must not quietly become scroll-only either.
      onSeek?.(beatAnchor(clamped, STOPS));
      return;
    }
    rail.current?.scrollTo({ x: clamped * step, animated: true });
    setActive(clamped);
  };

  /**
   * `active` has to be a plain number — the dots and the arrows' disabled
   * states are props, not animated values. Recomputed from the driver
   * rather than latched, so scrolling back up walks the deck backwards,
   * and guarded so only the two frames where a beat changes re-render.
   */
  useEffect(() => {
    if (!progress) return;
    const apply = (value: number) => {
      // Through the schedule, not `value * LAST`: the dots have to say
      // which beat is on screen, and with holds in the track those two
      // numbers are no longer the same thing.
      const next = Math.max(
        0,
        Math.min(LAST, Math.round(beatIndexAt(value, STOPS)))
      );
      setActive((previous) => (previous === next ? previous : next));
    };
    // addListener only fires on change; seed from where the driver
    // already is, or a deck mounted mid-section reads as beat one.
    apply((progress as unknown as { __getValue(): number }).__getValue());
    const id = progress.addListener(({ value }) => apply(value));
    return () => progress.removeListener(id);
  }, [progress, LAST]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / step);
    if (index !== active && index >= 0 && index < BEATS.length)
      setActive(index);
  };

  /**
   * The deck deals itself.
   *
   * At progress 0 the three panels are stacked — each one sitting on the
   * first one's spot, a little smaller and a little lower, the way a
   * held deck looks — and over the first slice of the track they spread
   * into the rail. That first slice is the only part of this section a
   * reader sees before the stage pins, so it is the part that had
   * nothing happening in it: the section arrived with one card already
   * at rest and the other two off-stage, which is a rail that has
   * finished rather than a deck about to be played.
   *
   * The easing overshoots. Every other movement on this page is there to
   * explain what went where; this one is there to be watched, and a
   * spread that merely decelerates reads as a layout settling where one
   * that carries a little past and comes back reads as cards being
   * dealt.
   */
  const spread = progress
    ? progress.interpolate({
        inputRange: [0, SPREAD_ENDS_AT],
        outputRange: [0, 1],
        extrapolate: 'clamp',
        easing: EASING.overshoot,
      })
    : null;

  // Built once and rendered by whichever rail is in play, so the driven
  // and the swipeable deck can never show different panels.
  const panels = BEATS.map((beat, index) => (
    <Animated.View
      key={beat.kind}
      style={[
        styles.panel,
        { width: panelW, borderColor: `${beat.hue}4D` },
        // First card on top of the stack, so the deck reads as one held
        // in a hand rather than as three sheets in DOM order.
        spread ? { zIndex: BEATS.length - index } : null,
        spread && index > 0
          ? {
              transform: [
                {
                  translateX: spread.interpolate({
                    inputRange: [0, 1],
                    // Home, minus the whole distance to the first
                    // panel, plus the sliver a stacked card shows of
                    // the one under it.
                    outputRange: [-index * step + index * STACK_PEEK, 0],
                  }),
                },
                {
                  translateY: spread.interpolate({
                    inputRange: [0, 1],
                    outputRange: [index * STACK_DROP, 0],
                  }),
                },
                {
                  scale: spread.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1 - index * STACK_SHRINK, 1],
                  }),
                },
              ],
            }
          : null,
      ]}
    >
      {/* The tint is a wash over the well, not a colour of its own —
          the beats stay rooms in the same house. */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: `${beat.hue}14` }]}
        pointerEvents="none"
      />
      {/* No 01/02/03.
          The numerals earned their place when this was a swipeable deck
          showing two panels at once, where you needed to know your place
          in a sequence you could see the edges of. Scroll-driven, one
          beat at a time, the dots underneath already say that — and the
          numeral was the largest coloured object in the panel, spending
          the loudest emphasis on the least interesting fact in it. The
          lead line owns that space now. The beat's colour still arrives
          through the panel border, the tint, and the figure on its
          evidence card. */}
      <View style={styles.panelHead}>
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
    </Animated.View>
  ));

  return (
    <View onLayout={onLayout}>
      {/* No wash here.
          The room's light is `BeatWash`, and it is handed to the stage
          as a track backdrop rather than rendered in the deck, because
          rendered here it was inside the stage's vertical clip and
          could never reach the section's own edges. */}
      <View style={[styles.head, { paddingHorizontal: inset }]}>
        {/* The mark and the nameplate are ONE left-hand group.
            The section's quest mark used to sit here as a bare sibling,
            and because it renders a 1x1 View in normal flow it took the
            first slot of this space-between row and shunted the chip
            into the middle of the header — a nameplate floating between
            nothing and the arrows. The mark is gone now (see below), and
            the group keeps the chip hard left where a nameplate belongs,
            with the arrows opposite it. */}
        {/* No QuestMark here, deliberately.
            The trail is drawn over the page from the Y position of each
            section's mark, and it reads because those sections travel
            past the reader — the line is the page's own thread. This
            section is pinned: it holds still while the page scrolls
            through it, so a thread routed through its mark flows into a
            thing that is not moving and stops describing anything. The
            trail now runs from "how" straight on to the pile, and the
            deck is the one chapter it steps over. */}
        <View style={styles.headLeft}>
          {/* The deck's nameplate: a solid white chip, the one high-key
              object in the section, so the eye lands here first and the
              arrows beside it explain themselves. */}
          <Rise from="mask">
            <View style={styles.chip}>
              <Ionicons name="game-controller" size={16} color={COLORS.navy} />
              <Text style={styles.chipWord}>HOW IT WORKS</Text>
            </View>
          </Rise>
        </View>
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

      {progress ? (
        /**
         * The driven rail. Same panels, same widths, same gap — the only
         * difference is what moves them. `overflow: hidden` on the room
         * replaces the ScrollView's own clipping, and the row is offset
         * by the reader's position through the section.
         */
        <View style={[styles.railRoom, styles.railDriven]}>
          <Animated.View
            style={[
              styles.railContent,
              styles.railRow,
              /**
               * Centred, not inset. Left-aligned the rail put every
               * panel at the column's left edge, which is right for the
               * first two — the next one peeks in on the right — and
               * wrong for the last, which had the entire remaining
               * window empty beside it and read as a deck that had run
               * out rather than one that had finished. Centring spends
               * the same space on both sides of whichever beat is being
               * read.
               */
              { paddingLeft: Math.max(inset, (width - panelW) / 2) },
              {
                transform: [
                  {
                    /**
                     * Held, then travelled — not a straight line from
                     * the first beat to the last. Linear, the first
                     * panel became whole at the instant the section
                     * pinned and began sliding away on the next pixel
                     * of scroll, so no beat was ever both complete and
                     * still. See `lib/beatDeck`.
                     */
                    translateX: progress.interpolate({
                      inputRange: STOPS.input,
                      outputRange: STOPS.output.map((at) => -step * at),
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {panels}
          </Animated.View>
        </View>
      ) : (
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
          {panels}
        </ScrollView>
      )}

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
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
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
    fontFamily: 'Geom-ExtraBold',
    fontSize: 13,
    letterSpacing: 1.5,
    color: COLORS.navy,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center' },
  arrows: { flexDirection: 'row', gap: SPACING.sm },
  /**
   * The section's own box, edge to edge, and one seam higher.
   *
   * This is a track backdrop now, so it is measured against the thing
   * the reader thinks of as the section rather than against the deck
   * inside it. `bottom: 0` is the closing seam. `top` reaches back over
   * the opening one, because the seam is the leading edge of the band
   * BELOW it — a wash that started under the seam left the tint
   * beginning a hairline inside a room that had visibly already begun.
   *
   * Absolutely positioned because `ScrollStage` renders this inside the
   * track: anything in normal flow here would add to the track's
   * height, which is the number the entire pin is measured from.
   */
  wash: {
    position: 'absolute',
    top: -SEAM_LIP_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
  /**
   * The driven rail clips where the ScrollView used to. Without this the
   * off-stage panels hang past the section and are visible either side
   * of it, which is the one thing the horizontal scroller did for free.
   */
  railDriven: { overflow: 'hidden' },
  /**
   * `flex-start`, so each panel is exactly as tall as its own contents.
   *
   * Stretching them to the tallest (the third beat, which carries the
   * drop reasons under its card) left the other two with 88 measured
   * points of nothing below the artwork. Spending that slack with
   * space-between only moved the hole — it opened between the body copy
   * and the evidence instead, which reads worse because the two belong
   * together. There is no slack to spend: the panels just stop where
   * they stop, and the deck shows one at a time anyway.
   */
  railRow: { flexDirection: 'row', alignItems: 'flex-start' },
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
