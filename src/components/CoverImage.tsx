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
  /**
   * What to show if `uri` will not load.
   *
   * Box art comes from IGDB and the screenshot behind it from RAWG, and
   * a burst of forty cover requests reliably drops a few. Falling back
   * to the art we already have turns that into a picture nobody
   * notices, rather than a plate where a game should be.
   */
  fallbackUri?: string | null;
  style: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Fallback glyph size, tuned to the container. */
  iconSize?: number;
  /** Which slot this fills, so the right derivative is requested. */
  size?: keyof typeof SLOT_WIDTH;
  /**
   * Softens the picture in place. For artwork used as a ground rather
   * than as a thing to look at — the You masthead builds its colour
   * field out of the reader's own covers, and sharp covers there read
   * as a broken gallery instead of as a backdrop.
   */
  blurRadius?: number;
  /**
   * How urgently the picture is wanted. The masthead a page opens on is
   * `high`; a tile three shelves down can wait its turn behind it.
   */
  priority?: 'low' | 'normal' | 'high';
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
  fallbackUri,
  style,
  contentFit = 'cover',
  iconSize = 32,
  size = 'tile',
  blurRadius,
  priority,
  label,
}: Props) {
  /**
   * Which URLs have failed, rather than whether one did.
   *
   * A boolean could not tell two sources apart, so a tile that failed
   * once stayed a plate for the rest of its life - including after the
   * `uri` prop changed to a perfectly good picture, which is exactly
   * what the hover reel does five times a shelf.
   */
  const [failed, setFailed] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const candidates = [
    mediaUri(uri, SLOT_WIDTH[size]),
    mediaUri(fallbackUri, SLOT_WIDTH[size]),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const src = candidates.find((candidate) => !failed.has(candidate)) ?? null;

  if (!src) {
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
        // Keyed by source so a swap mounts a fresh element rather than
        // reusing one the platform has already marked broken.
        key={src}
        source={{ uri: src }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        blurRadius={blurRadius}
        transition={DURATION.base}
        priority={priority}
        // In a virtualised list a recycled view must not show the last
        // row's cover while this one decodes.
        recyclingKey={src}
        onError={() =>
          setFailed((prev) => {
            const next = new Set(prev);
            next.add(src);
            return next;
          })
        }
        accessible={!!label}
        accessibilityRole={label ? 'image' : undefined}
        accessibilityLabel={label}
        // Decorative by default: a cover beside its own title is noise.
        importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
        alt={label ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The navy veil that used to sit here graded every photograph in the
  // app toward the palette - and greyed every one of them. Vivid art
  // with quiet chrome is the premium arrangement, not the reverse.
  fallback: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
