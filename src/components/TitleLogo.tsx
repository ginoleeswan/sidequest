import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ArtAsset } from '@/api/art';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASING } from '@/styles/motion';

interface Props {
  /**
   * The mark. `undefined` while the lookup is still out, `null` when it
   * came back with nothing — two different answers, and the difference
   * decides whether the typed title should appear at all.
   */
  logo: ArtAsset | null | undefined;
  /** The game's name, for the screen reader and as the fallback. */
  name: string;
  /** The box the mark must fit inside, in points. */
  maxWidth: number;
  maxHeight: number;
  style?: StyleProp<ViewStyle>;
  /**
   * How the typed title sits against the mark's box while the mark is
   * on its way: centred on it, as a phone masthead is, or sharing its
   * left edge, as the desk's lockup does.
   */
  align?: 'center' | 'start';
  /** What to show until, or instead of, the logo: the typed title. */
  children: React.ReactNode;
}

/**
 * How long the slot may stay quiet waiting for the mark before the
 * typed title steps in.
 *
 * The title used to paint at once and be replaced when the mark landed:
 * a game's name set in this app's face, then the publisher's drawing of
 * it a beat later — two different shapes for the same word, which on a
 * device read as the page changing its mind. Most marks arrive inside
 * this window (the lookup is edge-cached, the file is usually on disk),
 * so most of the time the typed title is simply never seen.
 */
const HOLD = 800;

/**
 * The file to ask for. The smaller cut where it is enough: a mark at
 * two pixels a point under the thumb's five hundred, and the full file
 * can run to a couple of megabytes.
 */
export function logoUri(logo: ArtAsset, width: number): string {
  return width * 2 <= 480 ? logo.thumb : logo.url;
}

/**
 * The game's own title treatment, where a name would otherwise be typed.
 *
 * Every streaming shelf sets the publisher's logo over the artwork
 * instead of the title in the app's face, and the difference is the
 * difference between a catalogue and a marquee. The mark is fitted into
 * a box from the dimensions the server already knows, so the layout is
 * settled before a byte of it arrives and nothing under it moves.
 *
 * The typed title is never gone for a reader who needs it: it is what
 * shows when there is no logo, when the file will not load, or when the
 * mark is slow; and it is what a screen reader is told either way — a
 * picture of the word "Hades" is still the word Hades.
 */
export function TitleLogo({
  logo,
  name,
  maxWidth,
  maxHeight,
  style,
  align = 'center',
  children,
}: Props) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  // Whether the wait has run out and the typed title has been asked for.
  const [overdue, setOverdue] = useState(false);
  const words = useAnimatedValue(0);
  const mark = useAnimatedValue(0);

  const usable = logo && failed !== logo.url && maxWidth > 0 ? logo : null;
  const aspect = usable ? usable.width / usable.height : 1;
  const height = usable ? Math.min(maxHeight, maxWidth / aspect) : 0;
  const width = height * aspect;
  const uri = usable ? logoUri(usable, width) : null;
  const shown = uri != null && loaded === uri;

  // No answer yet, or an answer whose file has not arrived: wait, then
  // give up waiting and set the name.
  const waiting = logo === undefined || (uri != null && !shown);
  useEffect(() => {
    if (!waiting || overdue) return;
    const timer = setTimeout(() => setOverdue(true), HOLD);
    return () => clearTimeout(timer);
  }, [waiting, overdue]);

  // The words are wanted when there is definitely no mark, or when the
  // mark has kept the reader waiting long enough.
  const wantWords = !shown && (!waiting || overdue);
  // Where the words' fade last came to rest. Rendered as a plain style
  // once it has, so the settled page carries no animated props at all.
  const [wordsAt, setWordsAt] = useState<0 | 1 | null>(null);
  // A known "no logo" is not an arrival: the name is set as if it had
  // always been there. Only words that step in late, or step aside for
  // the mark, fade.
  const instant = reduced || (wantWords && !overdue);
  useEffect(() => {
    if (instant) return;
    const to = wantWords ? 1 : 0;
    const animation = Animated.timing(words, {
      toValue: to,
      duration: to === 1 ? DURATION.base : DURATION.slow,
      easing: to === 1 ? EASING.standard : EASING.exit,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && setWordsAt(to));
    return () => animation.stop();
  }, [wantWords, instant, words]);
  const wordsOpacity = instant
    ? wantWords
      ? 1
      : 0
    : wordsAt === (wantWords ? 1 : 0)
      ? wordsAt
      : words;

  useEffect(() => {
    if (!shown) {
      mark.setValue(0);
      return;
    }
    if (reduced) {
      mark.setValue(1);
      return;
    }
    // The mark dissolves in over the words' dissolve out: the same
    // duration, so there is never a frame with neither.
    const animation = Animated.timing(mark, {
      toValue: 1,
      duration: DURATION.slow,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [shown, reduced, mark]);

  // No mark to wait for: the typed title, in flow, as it always was.
  if (!usable || !uri) {
    return (
      <Animated.View style={{ opacity: wordsOpacity }}>
        {children}
      </Animated.View>
    );
  }

  return (
    <View
      style={[{ width, height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      testID="title-logo"
    >
      <Animated.View
        style={[
          styles.standIn,
          /* The slot's full width, not the mark's. The box is measured
             for the picture - for a tall mark it is 190 points wide -
             and words wrapped into it broke a name that fits on one
             line into three, then cut it off. */
          {
            width: maxWidth,
            left: align === 'center' ? (width - maxWidth) / 2 : 0,
            opacity: wordsOpacity,
          },
        ]}
        pointerEvents="none"
      >
        {children}
      </Animated.View>
      <Animated.View style={{ width, height, opacity: mark }}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="contain"
          contentPosition={Platform.OS === 'web' ? 'left' : 'left center'}
          priority="high"
          cachePolicy="memory-disk"
          onLoad={() => setLoaded(uri)}
          onError={() => setFailed(usable.url)}
          alt={name}
          accessible={false}
          testID="title-logo-image"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The words sit where they would have sat, not inside the mark's box.
   *
   * The box is measured for the picture — often a wide, short banner —
   * and a two-line title crammed into it would be a second layout
   * rather than the one the page already drew. Out of flow, anchored at
   * the same left edge and baseline, so nothing moves when the mark
   * lands on top of it.
   */
  standIn: { position: 'absolute', bottom: 0 },
});
