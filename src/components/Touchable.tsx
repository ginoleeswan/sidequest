import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type AccessibilityRole,
  type AccessibilityState,
  type Insets,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic as feel, type Haptic } from '@/lib/haptics';
import { COLORS } from '@/styles/colors';
import { HIT_SLOP, ICON, PRESSED_OPACITY, TOUCH } from '@/styles/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * How a control answers a finger.
 *
 * `opacity` for text and icons, `scale` for cards and plates — a card
 * that gives slightly under the thumb reads as an object, and a word
 * that shrinks reads as a glitch. `tint` lifts a plate a shade, for
 * rows where scaling would jostle the list.
 */
export type Feedback = 'opacity' | 'scale' | 'tint' | 'none';

interface Props extends Omit<PressableProps, 'style' | 'hitSlop'> {
  style?: StyleProp<ViewStyle>;
  /** Style added while pressed, on top of the feedback. */
  pressedStyle?: StyleProp<ViewStyle>;
  feedback?: Feedback;
  haptic?: Haptic;
  /** A named slop from `HIT_SLOP`, or explicit insets. */
  hitSlop?: keyof typeof HIT_SLOP | Insets | number;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}

/**
 * The one way this app makes something pressable.
 *
 * Measured across the app, 110 of 127 pressables had no pressed state
 * at all, 32 had no role, and the hit areas ranged from 25pt upward
 * with six different ad-hoc slops. Each of those was a decision made
 * once per call site and forgotten at the next. Here they are made
 * once: a role by default, a pressed state by default, a haptic when
 * asked for, and Reduce Motion honoured — a scale becomes a dim, never
 * nothing.
 */
export function Touchable({
  style,
  pressedStyle,
  feedback = 'opacity',
  haptic,
  hitSlop,
  onPress,
  accessibilityRole = 'button',
  ...rest
}: Props) {
  const reduced = useReducedMotion();
  const slop = typeof hitSlop === 'string' ? HIT_SLOP[hitSlop] : hitSlop;
  const kind = reduced && feedback === 'scale' ? 'opacity' : feedback;

  return (
    <Pressable
      {...rest}
      hitSlop={slop}
      accessibilityRole={accessibilityRole}
      onPress={
        onPress
          ? (event) => {
              feel(haptic);
              onPress(event);
            }
          : undefined
      }
      style={({ pressed }) => [
        style,
        pressed && kind === 'opacity' && styles.dim,
        pressed && kind === 'scale' && styles.give,
        pressed && kind === 'tint' && styles.tint,
        pressed && pressedStyle,
      ]}
    />
  );
}

interface IconButtonProps extends Omit<Props, 'children'> {
  icon: IconName;
  /** Required: an icon alone says nothing to VoiceOver. */
  accessibilityLabel: string;
  size?: keyof typeof ICON;
  color?: string;
  /**
   * `plate` sits the glyph on a dark disc, for controls over artwork;
   * `bare` is the glyph alone on the page.
   */
  variant?: 'bare' | 'plate';
}

/**
 * An icon that can be pressed: a 44pt target whatever the glyph's size.
 *
 * The header's search and profile were `Ionicons` with an `onPress`,
 * 29pt across and announced as text. The target is the box here, not
 * the glyph, so a 18pt icon still takes a whole thumb.
 */
export function IconButton({
  icon,
  size = 'lg',
  color = COLORS.white,
  variant = 'bare',
  style,
  ...rest
}: IconButtonProps) {
  return (
    <Touchable
      {...rest}
      style={[styles.icon, variant === 'plate' && styles.plate, style]}
    >
      <Ionicons name={icon} size={ICON[size]} color={color} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: PRESSED_OPACITY },
  give: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  tint: { backgroundColor: 'rgba(255,255,255,0.06)' },
  icon: {
    width: TOUCH.min,
    height: TOUCH.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH.min / 2,
  },
  plate: {
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
  },
});
