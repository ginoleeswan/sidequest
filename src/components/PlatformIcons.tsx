import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { COLORS } from '@/styles/colors';
import type { PlatformRef } from '@/api/types';

const VECTOR: Record<string, { name: string; type: IconType }> = {
  playstation: { name: 'logo-playstation', type: 'ionicon' },
  pc: { name: 'microsoft-windows', type: 'glyph' },
  mac: { name: 'logo-apple', type: 'ionicon' },
  linux: { name: 'linux', type: 'glyph' },
  android: { name: 'android', type: 'glyph' },
  ios: { name: 'apple-ios', type: 'glyph' },
  web: { name: 'web', type: 'glyph' },
  xbox: { name: 'microsoft-xbox', type: 'glyph' },
};

const IMAGES: Record<string, number> = {
  nintendo: require('../../assets/icons/nintendo.png'),
  atari: require('../../assets/icons/atari.png'),
  sega: require('../../assets/icons/sega.png'),
  'commodore-amiga': require('../../assets/icons/commodore-amiga.png'),
  'neo-geo': require('../../assets/icons/neo-geo.png'),
  '3do': require('../../assets/icons/3do.png'),
};

function iconFor(slug: string) {
  const imageKey = Object.keys(IMAGES).find((k) => slug.startsWith(k));
  if (imageKey) return { image: IMAGES[imageKey] };
  const vectorKey = Object.keys(VECTOR).find((k) => slug.startsWith(k));
  if (vectorKey) return { vector: VECTOR[vectorKey] };
  return null;
}

interface Props {
  platforms: PlatformRef[];
  size?: number;
  color?: string;
}

export function PlatformIcons({
  platforms,
  size = 20,
  color = COLORS.lightGrey,
}: Props) {
  return (
    <View style={styles.row}>
      {platforms.map(({ platform }) => {
        const icon = iconFor(platform.slug);
        if (!icon) return null;
        return icon.image ? (
          <Image
            key={platform.id}
            source={icon.image}
            style={{ width: size * 1.75, height: size }}
            contentFit="contain"
          />
        ) : (
          <View key={platform.id} style={styles.vector}>
            <DynamicIcon
              type={icon.vector!.type}
              name={icon.vector!.name}
              size={size}
              color={color}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  vector: { padding: 2 },
});
