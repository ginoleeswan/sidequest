import Ionicons from '@expo/vector-icons/Ionicons';

import { Glyph, type GlyphName } from './Glyph';

/**
 * Two sources, on purpose.
 *
 * Every family imported here ships its whole font to the browser, and
 * they are not small: the platform logos alone used to cost 1.6 MB
 * across MaterialCommunity and FontAwesome. Those are now paths in
 * Glyph.tsx. Before adding a family back, check the shape is not already
 * in Ionicons, and if it is a logo, extract it instead.
 */
export type IconType = 'ionicon' | 'glyph';

interface Props {
  type: IconType;
  name: string;
  size?: number;
  color?: string;
}

/** Icon resolved by family name — replaces react-native-elements' <Icon type=...>. */
export function DynamicIcon({ type, name, size = 20, color = 'white' }: Props) {
  if (type === 'glyph') {
    return <Glyph name={name as GlyphName} size={size} color={color} />;
  }
  return <Ionicons name={name as never} size={size} color={color} />;
}
