import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
} from 'react-native';

import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { HIT_SLOP, PRESSED_OPACITY } from '@/styles/theme';

interface Props {
  children: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Roughly how many characters a line of body copy holds on a phone.
 *
 * The web has no `onTextLayout`, so it cannot be told whether the clamp
 * actually cut anything. A guess errs towards offering the control: a
 * "Read more" under a paragraph that was already whole is a small
 * oddity, while a paragraph cut mid-sentence with no way to open it is
 * a missing feature.
 */
const CHARS_PER_LINE = 48;

/**
 * Collapsible text — replaces @fawazahmed/react-native-read-more.
 *
 * The control appears only when there is something to reveal. It used
 * to sit under every paragraph regardless, so a two-line description
 * ended in a "Read more" that opened nothing — the kind of detail that
 * makes a page read as templated rather than made.
 */
export function ReadMoreText({ children, numberOfLines = 3, style }: Props) {
  const [expanded, setExpanded] = useState(false);
  /**
   * Whether the clamp cut anything. Native answers from the laid-out
   * line count; the web falls back to length. `null` until known, and
   * while unknown the control is offered rather than withheld.
   */
  const [clipped, setClipped] = useState<boolean | null>(
    Platform.OS === 'web'
      ? children.length > numberOfLines * CHARS_PER_LINE
      : null
  );

  const onTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    // Measured only while clamped: the expanded layout reports every
    // line, which says nothing about whether the clamp mattered.
    if (expanded || Platform.OS === 'web') return;
    const lines = event.nativeEvent.lines.length;
    setClipped(lines > numberOfLines);
  };

  const canToggle = clipped !== false;

  return (
    <Touchable
      onPress={canToggle ? () => setExpanded((e) => !e) : undefined}
      disabled={!canToggle}
      // The paragraph is the target, and dimming a whole paragraph under
      // a thumb reads as it failing to load; the words that act are the
      // ones that answer the press.
      feedback="none"
      hitSlop={HIT_SLOP.text}
      // A disclosure, said as one: VoiceOver announces the paragraph,
      // that it is a button, and whether it is open.
      accessibilityRole={canToggle ? 'button' : 'text'}
      accessibilityState={canToggle ? { expanded } : undefined}
    >
      {({ pressed }) => (
        <>
          <Text
            style={style}
            numberOfLines={expanded ? undefined : numberOfLines}
            onTextLayout={onTextLayout}
          >
            {children}
          </Text>
          {/* White and bold, not the accent. Amber is time and the
              page's one primary action; a disclosure is neither, and
              blue — where this started — appears nowhere else in the
              palette. Sentence case, like every other control. */}
          {canToggle ? (
            <Text style={[style, styles.toggle, pressed && styles.pressed]}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          ) : null}
        </>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  toggle: { color: COLORS.white, fontFamily: 'Noah-Bold' },
  pressed: { opacity: PRESSED_OPACITY },
});
