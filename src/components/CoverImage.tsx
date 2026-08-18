import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageContentFit } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Textured } from './Textured';
import { COLORS } from '@/styles/colors';

interface Props {
  uri?: string | null;
  style: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Fallback glyph size, tuned to the container. */
  iconSize?: number;
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
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
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
      source={{ uri }}
      style={style as object}
      contentFit={contentFit}
      transition={200}
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
