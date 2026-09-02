import { useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
} from 'react-native';

import { COLORS } from '@/styles/colors';

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
 * "Read More" under a paragraph that was already whole is a small
 * oddity, while a paragraph cut mid-sentence with no way to open it is
 * a missing feature.
 */
const CHARS_PER_LINE = 48;

/**
 * Collapsible text — replaces @fawazahmed/react-native-read-more.
 *
 * The control appears only when there is something to reveal. It used
 * to sit under every paragraph regardless, so a two-line description
 * ended in a "Read More" that opened nothing — the kind of detail that
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
    <Pressable
      onPress={canToggle ? () => setExpanded((e) => !e) : undefined}
      disabled={!canToggle}
    >
      <Text
        style={style}
        numberOfLines={expanded ? undefined : numberOfLines}
        onTextLayout={onTextLayout}
      >
        {children}
      </Text>
      {/* The app's accent, not the link blue. Blue appears nowhere else
          in this palette, so "Read More" was the only cornflower thing
          on a navy-and-amber page. */}
      {canToggle ? (
        <Text
          style={[style, { color: COLORS.accent, fontFamily: 'Noah-Bold' }]}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </Text>
      ) : null}
    </Pressable>
  );
}
