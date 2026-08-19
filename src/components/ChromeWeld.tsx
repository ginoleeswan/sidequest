import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { GrainScrim } from './Textured';
import { COLORS } from '@/styles/colors';

/**
 * The join between iOS Safari's chrome and a full-bleed page.
 *
 * Safari paints its status bar and toolbar with the html canvas colour
 * (COLORS.navy). Anything running to the top of the document — hero
 * artwork, or the bones standing in for it — has to start at exactly that
 * colour and ease out of it, or the two meet on a visible line.
 *
 * Shared by the loaded hero and its skeleton so the seam cannot be fixed
 * in one and forgotten in the other.
 */
export function ChromeWeld({ height }: { height: number }) {
  return (
    <>
      <LinearGradient
        colors={[
          COLORS.navy,
          COLORS.darkGrey,
          'rgba(51,61,81,0.52)',
          'rgba(16,21,31,0.22)',
          'rgba(9,12,19,0)',
        ]}
        locations={[0, 0.14, 0.32, 0.62, 1]}
        style={[styles.layer, { height }]}
        pointerEvents="none"
      />
      <GrainScrim style={[styles.layer, { height }]} solidAt="band" />
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
