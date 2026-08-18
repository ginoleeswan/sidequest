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
