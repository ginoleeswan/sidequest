import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Touchable } from './Touchable';
import type { Haptic } from '@/lib/haptics';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  label: string;
  onPress: () => void;
  /**
   * `primary` is the page's one amber act. `secondary` is the ghost
   * beside it. `danger` lets something go, in the colour that means so.
   */
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  /** Stretch to the parent's width rather than hugging the label. */
  block?: boolean;
  haptic?: Haptic;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The button.
 *
 * There were four: amber at radius 10 on the game page, amber at 30 on
 * the empty states, white at 30 on the finish screen, white at 10 in the
 * duration sheet. Four primaries is none — a reader cannot learn what
 * the important thing looks like if it looks different on every screen.
 * Amber, 48pt, radius 10; the arcade button stays the stage's one
 * showpiece, and everything else that asks to be pressed is this.
 */
export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  busy = false,
  block = false,
  haptic = 'impact',
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const ink =
    variant === 'primary'
      ? COLORS.navy
      : variant === 'danger'
        ? COLORS.coralText
        : COLORS.lightGrey;
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled || busy}
      feedback="scale"
      haptic={haptic}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[
        styles.button,
        styles[variant],
        block && styles.block,
        (disabled || busy) && styles.off,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <>
          <Text
            style={[styles.label, { color: ink }]}
            numberOfLines={1}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {label}
          </Text>
          {icon ? <Ionicons name={icon} size={ICON.md} color={ink} /> : null}
        </>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
  },
  primary: {
    backgroundColor: COLORS.accent,
    // The cap's own lip, in a hairline: an amber face with a lit top
    // edge and a darker one under it reads as pressable at a glance.
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(120,72,6,0.35)',
  },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  danger: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,104,0.45)',
  },
  block: { alignSelf: 'stretch' },
  off: { opacity: 0.45 },
  label: { ...TYPE.label, fontSize: 15, lineHeight: 20 },
});
