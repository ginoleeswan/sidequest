import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

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
  if (!logo || failed === logo.url || maxWidth <= 0) return <>{children}</>;

  const aspect = logo.width / logo.height;
  const height = Math.min(maxHeight, maxWidth / aspect);
  const width = height * aspect;
  // The smaller cut where it is enough: a phone masthead at two pixels
  // a point is under the thumb's five hundred, and the full file can
  // run to a couple of megabytes.
  const uri = width * 2 <= 480 ? logo.thumb : logo.url;

  return (
    <View
      style={[{ width, height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      testID="title-logo"
    >
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="contain"
        contentPosition={Platform.OS === 'web' ? 'left' : 'left center'}
        transition={DURATION.base}
        priority="high"
        onError={() => setFailed(logo.url)}
        alt={name}
        accessible={false}
      />
    </View>
  );
}
