import Ionicons from '@expo/vector-icons/Ionicons';
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
  /**
   * What this artwork is, for a screen reader. Pass the game's name where
   * the image is the only thing identifying it. Leave unset where a title
   * sits next to it: the cover then adds nothing but noise, and is hidden
   * from assistive tech rather than announced as "image".
   */
  label?: string;
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
  label,
}: Props) {
  const [failed, setFailed] = useState(false);
  const src = mediaUri(uri, SLOT_WIDTH[size]);

  if (!src || failed) {
    return (
      <View
        style={[styles.fallback, style]}
        accessible={!!label}
        accessibilityRole={label ? 'image' : undefined}
        accessibilityLabel={label}
      >
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
    // The caller's style describes the slot — where it sits, how big, how
    // round — so it stays on the frame, and the picture fills it.
    <View style={style}>
      <Image
        source={{ uri: src }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={DURATION.base}
        onError={() => setFailed(true)}
        accessible={!!label}
        accessibilityRole={label ? 'image' : undefined}
        accessibilityLabel={label}
        // Decorative by default: a cover beside its own title is noise.
        importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
        alt={label ?? ''}
      />
      <View style={styles.veil} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.grade,
  },
  fallback: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
