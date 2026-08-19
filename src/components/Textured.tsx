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
    return (
      <View
        style={[
          base,
          {
            backgroundImage: `url(${uri})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '150px 150px',
          } as unknown as ViewStyle,
        ]}
        pointerEvents={fill ? 'none' : 'auto'}
      >
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
  /** Which edge the scrim is opaque at — the grain matches its weight. */
  solidAt?: 'top' | 'bottom';
}) {
  if (Platform.OS !== 'web') return null;
  const uri = Asset.fromModule(NOISE).uri;
  const fade =
    solidAt === 'bottom'
      ? 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 85%)'
      : 'linear-gradient(to bottom, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 100%)';
  return (
    <View
      style={[
        style,
        {
          backgroundImage: `url(${uri})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
          maskImage: fade,
          WebkitMaskImage: fade,
        } as unknown as ViewStyle,
      ]}
      pointerEvents="none"
    />
  );
}
