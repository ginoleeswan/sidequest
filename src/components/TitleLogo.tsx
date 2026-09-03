import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ArtAsset } from '@/api/art';
import { DURATION } from '@/styles/motion';

interface Props {
  logo: ArtAsset | null | undefined;
  /** The game's name, for the screen reader and as the fallback. */
  name: string;
  /** The box the mark must fit inside, in points. */
  maxWidth: number;
  maxHeight: number;
  style?: StyleProp<ViewStyle>;
  /** What to show until, or instead of, the logo: the typed title. */
  children: React.ReactNode;
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
 * The typed title is never gone: it is what shows while the answer is
 * unknown, what shows when there is no logo or the file will not load,
 * and what a screen reader is told either way — a picture of the word
 * "Hades" is still the word Hades.
 */
export function TitleLogo({
  logo,
  name,
  maxWidth,
  maxHeight,
  style,
  children,
}: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  if (!logo || failed === logo.url || maxWidth <= 0) return <>{children}</>;

  const aspect = logo.width / logo.height;
  const height = Math.min(maxHeight, maxWidth / aspect);
  const width = height * aspect;
  // The smaller cut where it is enough: a phone masthead at two pixels
  // a point is under the thumb's five hundred, and the full file can
  // run to a couple of megabytes.
  const uri = width * 2 <= 480 ? logo.thumb : logo.url;
  const shown = loaded === uri;

  /**
   * The typed title stays until the mark has actually arrived.
   *
   * Knowing a logo EXISTS and having it are half a second to several
   * seconds apart: the manifest is edge-cached JSON, the mark itself is
   * a transparent PNG from a third-party CDN. Dropping the words the
   * moment the JSON landed left the masthead's title slot empty for
   * that whole window — the game page opened, said the game's name, and
   * then unsaid it. So the words are underneath, the mark fades in over
   * them, and only once it is on screen do they go.
   */
  return (
    <View
      style={[{ width, height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      testID="title-logo"
    >
      {shown ? null : (
        <View style={styles.standIn} pointerEvents="none">
          {children}
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="contain"
        contentPosition={Platform.OS === 'web' ? 'left' : 'left center'}
        transition={DURATION.base}
        priority="high"
        onLoad={() => setLoaded(uri)}
        onError={() => setFailed(logo.url)}
        alt={name}
        accessible={false}
      />
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
  standIn: { position: 'absolute', left: 0, bottom: 0 },
});
