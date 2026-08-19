import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { GrainScrim } from './Textured';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  section: Section;
  lead?: Game;
  count?: number;
  /** Whether this section came from the genre list or the discover list. */
  kind: 'discover' | 'genre';
}

/**
 * Editorial masthead for a category page: the current top game's art as a
 * dimmed backdrop, the section's voice on top — so a browse page opens
 * like a magazine spread instead of a bare list.
 */
export function CategoryHero({ section, lead, count, kind }: Props) {
  return (
    <View style={styles.card}>
      {lead ? (
        <CoverImage
          uri={lead.background_image}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(23,29,41,0.42)', 'rgba(30,36,50,0.82)', '#2A3346']}
        locations={[0, 0.66, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.grain} />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>
          {kind === 'genre' ? 'GENRE' : 'DISCOVER'}
          {count ? `  ·  ${count.toLocaleString()} games` : ''}
        </Text>
        <Text style={styles.title}>{section.title}</Text>
        {section.description ? (
          <Text style={styles.description}>{section.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  copy: {
    padding: SPACING.lg,
    gap: SPACING.xs + 1,
    maxWidth: 560,
  },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.lightGrey,
    opacity: 0.85,
  },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    lineHeight: 34,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  description: {
    ...TYPE.p,
    color: COLORS.lightGrey,
  },
});
