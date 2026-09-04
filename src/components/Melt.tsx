import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Where a picture stops being a picture.
 *
 * The app has two full-bleed pictures — the home stage and the game
 * page's masthead — and both have to end somewhere. A scrim was the
 * obvious way: paint the page's own colour over the artwork, ramping
 * up, and by the last row the band is the page. It does not work, and
 * the reason is worth writing down because it looks like it should.
 *
 * A colour laid over a picture cannot reach the page's colour without
 * first passing through a mix of the two. Over a dark frame that mix is
 * invisible. Over a bright one it is not: at eighty percent of the way
 * down a warm orange key art, the blend of that orange with the page's
 * navy is a warm grey noticeably LIGHTER than the navy it is about to
 * become — so the picture stops, a paler band follows, and then the
 * page begins. A shelf, in the exact place the design wanted a melt.
 *
 * The answer is not to paint over the picture but to remove it. Masked,
 * what is left at the foot of the band is nothing, and nothing IS the
 * page — no blend, no band, no edge, whatever the artwork happens to
 * be. On the web that is a CSS mask; on iOS it is a layer mask, which
 * is what this wraps. The two draw the same curve from the same stops
 * so the phone and the browser cannot drift apart.
 */

/**
 * Full strength through the upper two fifths, then a long dissolve
 * reaching nothing at the foot. The length is the point: a picture that
 * fades over its last tenth reads as a picture with a soft edge, and
 * one that fades over its last three fifths reads as weather.
 */
const STOPS: readonly [number, number, ...number[]] = [0, 0.4, 0.7, 0.91, 1];
const ALPHA = [1, 1, 0.6, 0.16, 0] as const;

/** The ramp as colours, since a mask reads only their alpha. */
const MASK_COLOURS: readonly [string, string, ...string[]] = [
  'rgba(0,0,0,1)',
  'rgba(0,0,0,1)',
  'rgba(0,0,0,0.6)',
  'rgba(0,0,0,0.16)',
  'rgba(0,0,0,0)',
];

const CSS_MASK = `linear-gradient(to bottom, ${ALPHA.map(
  (a, i) => `rgba(0,0,0,${a}) ${Math.round(STOPS[i] * 100)}%`
).join(', ')})`;

/**
 * The web mask, as a style. Kept separate from the component because
 * the stage applies it to a layer it already owns rather than adding a
 * view to the tree.
 */
export const meltStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        maskImage: CSS_MASK,
        WebkitMaskImage: CSS_MASK,
      } as unknown as ViewStyle)
    : {};

export function Melt({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  if (Platform.OS === 'web') {
    return <View style={[style, meltStyle]}>{children}</View>;
  }
  return (
    <MaskedView
      style={style}
      maskElement={
        <LinearGradient
          // The mask reads alpha, so the colour is arbitrary and only
          // the opacity ramp matters.
          colors={MASK_COLOURS}
          locations={STOPS}
          style={StyleSheet.absoluteFill}
        />
      }
    >
      {children}
    </MaskedView>
  );
}
