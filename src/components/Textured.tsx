import { Asset } from 'expo-asset';
import {
  ImageBackground,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const NOISE = require('../../assets/images/noise.png');

/**
 * How far the grain takes to reach full strength at the top of a page.
 *
 * iOS Safari paints its chrome with theme-color: flat, untextured grey.
 * Our page colour matches it exactly, but the texture does not — full
 * grain starting on the first pixel draws a visible line under the status
 * bar. Ramping the grain in over this distance means the chrome dissolves
 * into the page instead of butting against it.
 */
const CHROME_FADE = '120px';

const GRAIN_TILE = '150px 150px';

/** Grain, ramped in from the top of the page. */
const TOP_FADE = `linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) ${CHROME_FADE})`;

/**
 * The colour iOS Safari paints its chrome with — the html canvas, which
 * is the footer's navy so the document's bottom edge welds too. The top
 * of every page eases out of it into the page colour over the same
 * distance the grain takes to arrive, so the status bar and the page read
 * as one surface rather than meeting on a line.
 */
const CHROME_BRIDGE =
  'linear-gradient(to bottom, #272F3F 0px, rgba(39,47,63,0.55) 38%, rgba(39,47,63,0) 100%)';

const styles = StyleSheet.create({
  noInteraction: { pointerEvents: 'none' },
});

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Render only the texture, filling the parent. */
  fill?: boolean;
}

/**
 * Tiled noise texture.
 *
 * `resizeMode="repeat"` is a no-op on react-native-web — it renders one
 * 300x300 tile in the corner instead of tiling. Web therefore uses a CSS
 * repeating background instead.
 */
export function Textured({ children, style, fill = false }: Props) {
  const base = fill ? [StyleSheet.absoluteFill, style] : style;

  if (Platform.OS === 'web') {
    const uri = Asset.fromModule(NOISE).uri;

    // Inside a card the texture is uniform: there is no browser chrome to
    // meet, and a card's own top edge is a border, not a seam.
    if (fill) {
      return (
        <View
          style={[
            base,
            {
              backgroundImage: `url(${uri})`,
              backgroundRepeat: 'repeat',
              backgroundSize: GRAIN_TILE,
            } as unknown as ViewStyle,
          ]}
          pointerEvents="none"
        >
          {children}
        </View>
      );
    }

    // As a page background the grain is a separate, masked layer so it can
    // fade in from the document top while the page colour stays solid all
    // the way up to the chrome.
    return (
      <View style={base}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage: `url(${uri})`,
              backgroundRepeat: 'repeat',
              backgroundSize: GRAIN_TILE,
              maskImage: TOP_FADE,
              WebkitMaskImage: TOP_FADE,
            } as unknown as ViewStyle,
          ]}
          pointerEvents="none"
        />
        <View
          style={
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: CHROME_FADE,
              backgroundImage: CHROME_BRIDGE,
            } as unknown as ViewStyle
          }
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={NOISE}
      resizeMode="repeat"
      style={[base, fill && styles.noInteraction]}
    >
      {children}
    </ImageBackground>
  );
}

/**
 * Grain that fades in with a scrim. A smooth gradient melting into the
 * page's textured background gives itself away at the hand-off - the
 * gradient is clean while the page is grainy. Masking the same noise tile
 * with a fade dithers the blend so the texture arrives with the colour.
 * Web-only: the mask is CSS; native heroes keep their plain gradient.
 */
export function GrainScrim({
  style,
  solidAt = 'bottom',
}: {
  style?: StyleProp<ViewStyle>;
  /**
   * Which edge the scrim is opaque at — the grain matches its weight.
   * 'band' additionally ramps in from the top, for chrome that sits at
   * the very top of the document.
   */
  solidAt?: 'top' | 'bottom' | 'band';
}) {
  if (Platform.OS !== 'web') return null;
  const uri = Asset.fromModule(NOISE).uri;
  const fade =
    solidAt === 'bottom'
      ? 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 85%)'
      : solidAt === 'band'
        ? `linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) ${CHROME_FADE}, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)`
        : 'linear-gradient(to bottom, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 100%)';
  return (
    <View
      style={[
        style,
        {
          backgroundImage: `url(${uri})`,
          backgroundRepeat: 'repeat',
          backgroundSize: GRAIN_TILE,
          maskImage: fade,
          WebkitMaskImage: fade,
        } as unknown as ViewStyle,
      ]}
      pointerEvents="none"
    />
  );
}
