import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { COLORS } from '@/styles/colors';

/**
 * The Sidequest mark: a quest marker with the brand letter knocked out.
 *
 * The diamond is the symbol every player already reads as "something
 * worth going to" — the marker floating over an objective — and the S
 * makes it ours rather than generic. One idea, two colours, and a
 * silhouette that survives a 16px browser tab, which an earlier mark
 * built from a path, a branch and a waypoint did not.
 *
 * Drawn from primitives rather than shipped as an asset: crisp at any
 * size, coloured from the tokens, and no request to make.
 */
export function Mark({ size = 22 }: { size?: number }) {
  const side = size * 0.72;

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <View
        style={
          {
            position: 'absolute',
            width: side,
            height: side,
            borderRadius: side * 0.16,
            backgroundColor: COLORS.accent,
            transform: [{ rotate: '45deg' }],
          } as ViewStyle
        }
      />
      <Text
        style={[
          styles.letter,
          {
            fontSize: size * 0.46,
            // Noah Black sits slightly high in its line box; nudge it back
            // to the marker's optical centre.
            lineHeight: size * 0.52,
          },
        ]}
      >
        S
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  letter: {
    fontFamily: 'Noah-Black',
    color: COLORS.navy,
    textAlign: 'center',
  },
});
