import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageContentFit } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Textured } from './Textured';
import { mediaUri } from '@/api/rawg';
import { COLORS } from '@/styles/colors';
import { DURATION } from '@/styles/motion';

/**
 * How wide the slot is, in CSS pixels, so RAWG can render a derivative
 * that fits it. Named rather than numeric: the exact figure matters less
 * than every slot of a kind agreeing, so an image is fetched once.
 */
const SLOT_WIDTH = {
  /** Row thumbnails and list rows — 56-96px in practice. */
  thumb: 100,
  /** Shelf tiles and grid cards — the bulk of the app. */
  tile: 320,
  /** Full-bleed artwork: game headers, featured heroes. */
  hero: 640,
} as const;

interface Props {
  uri?: string | null;
  style: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Fallback glyph size, tuned to the container. */
  iconSize?: number;
  /** Which slot this fills, so the right derivative is requested. */
  size?: keyof typeof SLOT_WIDTH;
}

/**
 * Game artwork with a branded fallback: when a game has no cover, or the
 * image fails to load, show a textured plate with a controller glyph
 * instead of a flat empty box.
 */
export function CoverImage({
  uri,
  style,
  contentFit = 'cover',
  iconSize = 32,
  size = 'tile',
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = mediaUri(uri, SLOT_WIDTH[size]);

  if (!src || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Textured fill />
        <Ionicons
          name="game-controller-outline"
          size={iconSize}
          color="rgba(255,255,255,0.18)"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={style as object}
      contentFit={contentFit}
      transition={DURATION.base}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
