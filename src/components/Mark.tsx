import { StyleSheet, View, type ViewStyle } from 'react-native';

import { COLORS } from '@/styles/colors';

/**
 * The Sidequest mark: a path that keeps going, and the branch that leaves
 * it for somewhere worth arriving at.
 *
 * Drawn from primitives rather than shipped as an asset so it stays crisp
 * at any size, takes its colour from the tokens, and costs no request.
 * The geometry matches the app icons exactly — see scripts/icons.
 */
export function Mark({ size = 22 }: { size?: number }) {
  const stroke = size * 0.1;
  const x = size * 0.28;

  // The branch is a bar rotated about its own centre, so it is placed by
  // the midpoint of the segment it represents rather than its corner.
  const forkY = size * 0.58;
  const reach = size * 0.3;
  const half = reach / 2;
  const dx = Math.cos(-Math.PI / 4) * half;
  const dy = Math.sin(-Math.PI / 4) * half;

  const gap = size * 0.12;
  const tipX = x + dx * 2 + gap;
  const tipY = forkY + dy * 2 - gap;
  const diamond = size * 0.15;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.piece,
          {
            left: x - stroke / 2,
            top: size * 0.08,
            width: stroke,
            height: size * 0.84,
            borderRadius: stroke,
            backgroundColor: COLORS.white,
          },
        ]}
      />
      <View
        style={[
          styles.piece,
          {
            left: x + dx - half,
            top: forkY + dy - stroke / 2,
            width: reach,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: COLORS.accent,
            transform: [{ rotate: '-45deg' }],
          } as ViewStyle,
        ]}
      />
      <View
        style={[
          styles.piece,
          {
            left: tipX - diamond / 2,
            top: tipY - diamond / 2,
            width: diamond,
            height: diamond,
            borderRadius: size * 0.02,
            backgroundColor: COLORS.accent,
            transform: [{ rotate: '45deg' }],
          } as ViewStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
});
