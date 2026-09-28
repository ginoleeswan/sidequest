import MaskedView from '@react-native-masked-view/masked-view';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { COLORS } from '@/styles/colors';

const NOISE = require('../../assets/images/noise.png');

/**
 * The phone's grain, drawn for the phone.
 *
 * `noise.png` is the web's tile, and on a phone it was two faults at
 * once. It is a single density, so iOS drew each speck across three
 * device pixels and smoothed it into a haze, and Android tiles at the
 * bitmap's own pixels, which put a speck at a third of a point where
 * nobody can see it. And it only lightens: mid-grey flecks at two per
 * cent, which over the navy moved the page by four levels — a surface
 * that measures as textured and reads as flat paint.
 *
 * `grain.png` ships at 1x, 2x and 3x so every screen draws the same
 * 150pt tile with crisp specks, and it carries dark specks as well as
 * light ones, so the ground has tooth rather than dust. Drawn by
 * `scripts/make-grain.mjs`; rerun that rather than editing the files.
 */
const GRAIN = require('../../assets/images/grain.png');

/**
 * How far the grain takes to reach full strength at the top of a page.
 *
 * iOS Safari paints its chrome with theme-color: flat, untextured grey.
 * Our page colour matches it exactly, but the texture does not — full
 * grain starting on the first pixel draws a visible line under the status
 * bar. Ramping the grain in over this distance means the chrome dissolves
 * into the page instead of butting against it.
 */
const CHROME_FADE = '150px';

const GRAIN_TILE = '150px 150px';

/**
 * Grain, ramped in from the top of the page.
 *
 * Held at zero for the first rows, not merely started there: a stop at
 * exactly 0px still gets sampled at the pixel's centre, and that sliver
 * of noise is what measured every page's first row at 40,48,64 against
 * a status bar of 39,47,63 — one unit off, on every route at once.
 */
const TOP_FADE = `linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 16px, rgba(0,0,0,1) ${CHROME_FADE})`;

/**
 * The colour iOS Safari paints its chrome with — the html canvas, which
 * is the footer's navy so the document's bottom edge welds too. The top
 * of every page eases out of it into the page colour over the same
 * distance the grain takes to arrive, so the status bar and the page read
 * as one surface rather than meeting on a line.
 */
const CHROME_BRIDGE =
  'linear-gradient(to bottom, #272F3F 0px, #272F3F 14px, rgba(39,47,63,0.6) 40%, rgba(39,47,63,0.25) 72%, rgba(39,47,63,0) 100%)';

/** How far down the page the lamplight reaches before it is gone. */
const LAMP_REACH = 460;

const styles = StyleSheet.create({
  noInteraction: { pointerEvents: 'none' },
  lamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LAMP_REACH,
  },
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
      source={GRAIN}
      resizeMode="repeat"
      style={[base, fill && styles.noInteraction]}
    >
      {fill ? null : <Lamplight />}
      {children}
    </ImageBackground>
  );
}

/**
 * The light the page is read by.
 *
 * A flat ground is lit from nowhere, and that is most of why a dark
 * screen reads as a colour rather than as a place: nothing on it is
 * nearer the light than anything else. Two pools at the top of every
 * page fix that — amber from the left, the app's own lamp, and the
 * evening's violet from the right — each a few per cent, gone well
 * before the first fold. They sit under the scroller, so the page
 * moves across the light rather than the light moving with the page.
 *
 * Native only. On the web the page's first rows have to match the
 * browser's own chrome to the unit (see `CHROME_BRIDGE`), and a glow
 * there would draw the line the bridge exists to remove.
 */
function Lamplight() {
  return (
    <View style={styles.lamp} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient
            id="lamp-amber"
            cx="12%"
            cy="0%"
            rx="80%"
            ry="95%"
            fx="12%"
            fy="0%"
          >
            <Stop offset="0" stopColor={COLORS.accent} stopOpacity={0.085} />
            <Stop offset="0.55" stopColor={COLORS.accent} stopOpacity={0.025} />
            <Stop offset="1" stopColor={COLORS.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="lamp-violet"
            cx="100%"
            cy="8%"
            rx="70%"
            ry="80%"
            fx="100%"
            fy="8%"
          >
            <Stop offset="0" stopColor={COLORS.violet} stopOpacity={0.07} />
            <Stop offset="1" stopColor={COLORS.violet} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lamp-violet)" />
        <Rect width="100%" height="100%" fill="url(#lamp-amber)" />
      </Svg>
    </View>
  );
}

/** The fade that `GrainScrim` masks with, as colours for a native mask. */
const NATIVE_FADES = {
  bottom: {
    colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)'],
    locations: [0, 0.85, 1],
  },
  top: {
    colors: ['rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)'],
    locations: [0, 0.25, 1],
  },
  band: {
    colors: [
      'rgba(0,0,0,0)',
      'rgba(0,0,0,1)',
      'rgba(0,0,0,1)',
      'rgba(0,0,0,0)',
    ],
    locations: [0, 0.2, 0.62, 1],
  },
} as const;

/**
 * Grain that fades in with a scrim. A smooth gradient melting into the
 * page's textured background gives itself away at the hand-off - the
 * gradient is clean while the page is grainy. Masking the same noise tile
 * with a fade dithers the blend so the texture arrives with the colour.
 * A CSS mask on the web, a layer mask on native — the same pair `Melt`
 * uses, for the same reason.
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
  if (Platform.OS !== 'web') {
    // The same fade as a layer mask. Without it every native hero ended
    // in a clean gradient laid on a grainy page, and the hand-off was
    // the one place on the screen where the texture visibly stopped.
    const fade = NATIVE_FADES[solidAt];
    return (
      <MaskedView
        style={[style, styles.noInteraction]}
        pointerEvents="none"
        maskElement={
          <LinearGradient
            colors={fade.colors}
            locations={fade.locations}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <ImageBackground
          source={GRAIN}
          resizeMode="repeat"
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
    );
  }
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
