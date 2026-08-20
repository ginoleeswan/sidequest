import { SvgXml } from 'react-native-svg';
import { View, useWindowDimensions } from 'react-native';

import type { Memcard as MemcardModel } from '@/lib/memcard';
import { CARD_HEIGHT, CARD_WIDTH, memcardSvg } from '@/lib/memcardSvg';
import { RADIUS } from '@/styles/theme';

/**
 * The card on screen.
 *
 * Same drawing as the image that gets shared — one SVG, rendered here
 * and rasterised there — so what someone posts is exactly what they
 * were looking at.
 */
export function Memcard({
  card,
  maxWidth,
}: {
  card: MemcardModel;
  maxWidth?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(maxWidth ?? CARD_WIDTH, windowWidth - 32, CARD_WIDTH);
  const height = (width / CARD_WIDTH) * CARD_HEIGHT;

  return (
    <View
      style={{ width, height, borderRadius: RADIUS.md, overflow: 'hidden' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${card.year}: ${card.headline}`}
    >
      <SvgXml xml={memcardSvg(card)} width={width} height={height} />
    </View>
  );
}
