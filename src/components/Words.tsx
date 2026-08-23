import { useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type TextStyle,
  type StyleProp,
} from 'react-native';

import { useInView } from './Rise';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EASING } from '@/styles/motion';

/**
 * A line that arrives a word at a time, each climbing out of its own
 * clipped edge.
 *
 * The page had five entrances and a reader who said they were all the
 * same, and the reader was right: five directions of the same one-shot
 * block fade is one idea about motion wearing five hats. Nothing on the
 * page staggered below the level of a whole element, so every headline
 * arrived as a rectangle — and a rectangle of type moving is a rectangle
 * moving, whatever direction it came from.
 *
 * Setting each word on its own clock is a different thing entirely: it
 * reads as writing rather than as appearing, the eye follows the line in
 * the order it would read it anyway, and it is the one type treatment
 * that cannot be mistaken for a fade. It costs a wrapper per word, which
 * is why it is reserved for the six or seven lines that carry the page.
 *
 * The words lay out in a wrapping row rather than as a single string, so
 * the gap has to be drawn rather than typed — a space inside a clipped
 * box travels with its own word and leaves a hole. Sized off the type,
 * because a fixed gap is a different word space at thirty points and at
 * fifty-four.
 */
export function Words({
  text,
  style,
  delay = 0,
  stagger = 42,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  delay?: number;
  /** Between one word setting off and the next. */
  stagger?: number;
}) {
  const words = text.split(' ');
  const reduced = useReducedMotion();
  const [ref, seen] = useInView();
  const enter = useAnimatedValue(reduced ? 1 : 0);

  const flat = StyleSheet.flatten(style) ?? {};
  const size = typeof flat.fontSize === 'number' ? flat.fontSize : 20;
  const line =
    typeof flat.lineHeight === 'number'
      ? flat.lineHeight
      : Math.round(size * 1.2);

  useEffect(() => {
    if (reduced || !seen) return;
    /**
     * One value for the whole line, and each word reading a different
     * window of it. Twenty timings would be twenty animations to keep
     * in step; this is one, and the stagger is a property of the
     * interpolation rather than of the scheduling.
     */
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 420 + words.length * stagger,
      delay,
      easing: EASING.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, seen, reduced, delay, stagger, words.length]);

  const total = 420 + words.length * stagger;

  return (
    /**
     * One label for the line, and every word hidden behind it.
     *
     * Splitting a headline into a Text per word splits it for a screen
     * reader too — twenty separate announcements where there was one
     * sentence, which is a real cost and not a test artefact. The
     * wrapper carries the whole line as its label and the pieces are
     * hidden from the tree. The words stay in the DOM as text, so a
     * crawler still reads the sentence; only assistive technology takes
     * the tidier path.
     */
    <View
      ref={ref}
      accessible
      accessibilityLabel={text}
      style={[styles.line, { columnGap: size * 0.26 }]}
    >
      {words.map((word, index) => {
        const from = (index * stagger) / total;
        const to = from + 420 / total;
        return (
          <View
            key={`${word}-${index}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.clip}
          >
            <Animated.Text
              style={[
                style,
                {
                  opacity: enter.interpolate({
                    inputRange: [from, to],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      translateY: enter.interpolate({
                        inputRange: [from, to],
                        outputRange: [line, 0],
                        // A word that has not set off yet must sit below
                        // the clip, not above it: without clamping, the
                        // interpolation runs on past both ends and the
                        // last words of a long line start out overhead.
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            >
              {word}
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap' },
  clip: { overflow: 'hidden' },
});
