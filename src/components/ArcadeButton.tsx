import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { EASING, SPRING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The button that behaves like the button it is drawn as.
 *
 * The page already drew an arcade cap — an amber face with four pixels
 * of darker amber under it — and then animated it by scaling the whole
 * thing down on press. That is the one motion the drawing cannot
 * survive: scaling shrinks the edge along with the face, so the button
 * reads as receding from the reader rather than being pushed into the
 * page, and the four pixels that were doing all the work get smaller
 * exactly when they should be disappearing.
 *
 * So the edge is a real object here, not a shadow. A base sits behind
 * the cap, offset down; the cap travels on press until it covers the
 * base and the button bottoms out, and lifts on hover until the edge is
 * half again as deep. Nothing scales, nothing glosses: it is the same
 * mechanism a cabinet button has, which is why it feels like one.
 *
 * And like a cabinet, it attracts. A real machine pulses its START lamp
 * at nobody in particular until somebody presses it, which is both the
 * oldest solution to this exact problem and the reason a slow amber
 * breath here reads as the object being what it is rather than as a
 * marketing throb. It is the only moving thing in the hero once the
 * pile has settled.
 *
 * All travel is `translateY` and all lamplight is `opacity`, both on the
 * native driver — no shadow or colour is animated, because this is the
 * first thing anyone touches on the page and a per-frame repaint here
 * would be felt on the whole hero.
 */

/** The dark amber under the cap. */
export const ARCADE_EDGE = '#B87A16';

/** How deep the edge is at rest — and so how far the cap travels. */
const TRAVEL = 4;

/** How much further the cap rises when a pointer is over it. */
const LIFT = 2;

/** How far the arrow leans toward where it is about to take you. */
const NUDGE = 3;

/** The glow at full, which only hover reaches. */
const GLOW_MAX = 0.85;

/**
 * How bright the idle breath gets, as a fraction of hover.
 *
 * Half. Past that it stops being peripheral and starts being a thing
 * you have to look away from, and a CTA the reader is actively
 * resisting is worse than one they have not noticed.
 */
const ATTRACT_PEAK = 0.5;

/** Swell, fall, then a long wait — a cabinet lamp, not a heartbeat. */
const ATTRACT_RISE = 1100;
const ATTRACT_REST = 2600;

export function ArcadeButton({
  label,
  onPress,
  onPressIn,
  icon = 'arrow-forward',
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const reduced = useReducedMotion();
  /** 0 at rest, -LIFT hovered, +TRAVEL pressed. */
  const travel = useAnimatedValue(0);
  /** Driven by the pointer: 0 away, 1 over. */
  const glow = useAnimatedValue(0);
  /** Driven by the attract loop, and added to the above. */
  const attract = useAnimatedValue(0);

  const spring = (value: Animated.Value, toValue: number) => {
    if (reduced) return;
    Animated.spring(value, {
      toValue,
      ...SPRING.press,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(attract, {
          toValue: ATTRACT_PEAK,
          duration: ATTRACT_RISE,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
        Animated.timing(attract, {
          toValue: 0,
          duration: ATTRACT_RISE,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
        Animated.delay(ATTRACT_REST),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [attract, reduced]);

  /**
   * Hover and attract, summed and then clamped.
   *
   * Clamping is what lets the loop keep running under the pointer
   * without fighting it: over the button the sum is already past 1, so
   * the lamp simply sits at full until the pointer leaves, and there is
   * no state to keep in sync between the two.
   */
  const lamp = Animated.add(glow, attract).interpolate({
    inputRange: [0, 1],
    outputRange: [0, GLOW_MAX],
    extrapolate: 'clamp',
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      onPressIn={() => {
        onPressIn?.();
        spring(travel, TRAVEL);
      }}
      onPressOut={() => spring(travel, 0)}
      onHoverIn={() => {
        spring(travel, -LIFT);
        spring(glow, 1);
      }}
      onHoverOut={() => {
        spring(travel, 0);
        spring(glow, 0);
      }}
      // Room for the cap to sit above its own base. Without it the base
      // would be clipped by the parent's layout box and the edge would
      // only exist at rest.
      style={[styles.root, style]}
    >
      {/* The lamp behind the cabinet button. Opacity only — a real
          shadow here would repaint the whole hero on every frame. */}
      <Animated.View
        style={[styles.glow, { opacity: lamp }]}
        pointerEvents="none"
      />
      {/* The base. Offset down by exactly the cap's travel, so pressing
          the cap lands it flush and the button visibly bottoms out. */}
      <View style={styles.base} pointerEvents="none" />
      <Animated.View
        style={[styles.cap, { transform: [{ translateY: travel }] }]}
      >
        {/* No sheen on the cap. A gradient here reads as glossy moulded
            plastic, and this palette is flat everywhere else — the depth
            in this button comes from the edge it presses into, not from
            a highlight painted on its face. */}
        {/* One line, and no second one under it.
            A small print line lived here — the two objections answered
            where the hand already is — and it was right about the
            objections and wrong about the place. A cap with a caption
            on it is a panel, not a button: it asks to be read where the
            rest of the object asks to be pressed. The claims are on the
            page under the button now, which is also where the reader
            was already finding them. */}
        <Text style={styles.label}>{label}</Text>
        {/* The arrow sits in a socket rather than floating beside the
            word. A bare icon next to a label is the one part of this
            button that could have come off any template; sinking it
            into a well of its own edge colour makes it part of the same
            moulding, and gives the contents two beats instead of a word
            with something after it. */}
        <View style={styles.socket}>
          <Animated.View
            style={{
              transform: [
                {
                  translateX: travel.interpolate({
                    // Leaning with the lift, not with the press: the
                    // arrow is an invitation, and an invitation that
                    // also fires on the click is just a twitch.
                    inputRange: [-LIFT, 0],
                    outputRange: [NUDGE, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          >
            <Ionicons name={icon} size={18} color={COLORS.navy} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    // The base lives inside this box and sits TRAVEL lower than the cap.
    paddingBottom: TRAVEL,
  },
  cap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: 18,
    // Tighter on the socket side: a circular token reads as further from
    // the edge than a glyph does at the same measured padding.
    paddingLeft: SPACING.xl + 6,
    paddingRight: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
  },
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: TRAVEL,
    borderRadius: RADIUS.lg,
    backgroundColor: ARCADE_EDGE,
  },
  glow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: RADIUS.lg + 6,
    backgroundColor: COLORS.accent,
    // Wide and faint: the point is that the amber bleeds onto the dark
    // page around the button, not that the button gains a halo.
    opacity: 0,
    filter: 'blur(14px)',
  },
  socket: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Translucent rather than the flat edge colour, so the well darkens
    // whatever it is over instead of punching a same-coloured hole
    // through the cap.
    backgroundColor: 'rgba(88,54,4,0.20)',
  },
  label: {
    ...TYPE.label,
    // Noah-Black, the weight the headline is set in — not the Bold that
    // TYPE.label carries. This is the one thing on the page a reader is
    // meant to press, sitting under a display face at ninety points; at
    // Bold it was the lightest thing in its own corner of the hero.
    fontFamily: 'Noah-Black',
    fontSize: 18,
    // Set in caps, so the tracking has to open up: Noah-Black sets very
    // tight, and capitals at 0.3 close into a solid bar. This is the
    // spacing the cabinet's own lettering has — and the same the
    // section nameplates on this page use.
    letterSpacing: 1.4,
    color: COLORS.navy,
  },
});
