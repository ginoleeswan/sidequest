import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { CoverImage } from './CoverImage';
import { Seam } from './Seam';
import { GrainScrim } from './Textured';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import { alpha, COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, OVER_IMAGE, TYPE } from '@/styles/typography';
import { countOf } from '@/lib/format';

interface Props {
  section: Section;
  lead?: Game;
  count?: number;
  /** Whether this section came from the genre list or the discover list. */
  kind: 'discover' | 'genre';
  /**
   * Edge to edge, the way Home's stage runs: `sides` is the gutter the
   * hero escapes, `top` the chrome it runs up under (the sheet's head
   * on the desk, the floating header on the phone), and the art fades
   * into the page rather than ending in a rounded frame. A card inset
   * in a column read as a pill.
   */
  bleed?: { top: number; sides: number } | null;
}

/**
 * Editorial masthead for a category page: the current top game's art as a
 * dimmed backdrop, the section's voice on top — so a browse page opens
 * like a magazine spread instead of a bare list.
 */
export function CategoryHero({
  section,
  lead,
  count,
  kind,
  bleed = null,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        bleed && styles.bleed,
        bleed && {
          marginHorizontal: -bleed.sides,
          marginTop: -bleed.top,
          paddingTop: bleed.top,
          minHeight: 300 + bleed.top,
        },
      ]}
    >
      {lead ? (
        <View style={[StyleSheet.absoluteFill, bleed && styles.fadeOut]}>
          <CoverImage
            uri={lead.background_image}
            style={StyleSheet.absoluteFill}
            size="hero"
          />
        </View>
      ) : null}
      <LinearGradient
        colors={[
          alpha(COLORS.inkRaised, 0.42),
          alpha(COLORS.inkSurface, 0.82),
          COLORS.surface,
        ]}
        locations={[0, 0.66, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.grain} />
      <View
        style={[
          styles.copy,
          bleed && styles.copyBleed,
          bleed && { paddingHorizontal: bleed.sides * 1.5 },
        ]}
      >
        <Text style={styles.eyebrow} maxFontSizeMultiplier={FONT_SCALE.label}>
          {kind === 'genre' ? 'GENRE' : 'DISCOVER'}
          {count ? `  ·  ${countOf(count, 'game')}` : ''}
        </Text>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={FONT_SCALE.display}
        >
          {section.title}
        </Text>
        {section.description ? (
          <Text style={styles.description}>{section.description}</Text>
        ) : null}
      </View>
      {/* The picture ends on a shoreline, not a rule. The gradient
          above bottoms out a shade off the page's ground, and where a
          hero runs edge to edge that shade met the page on a straight
          line the whole width of the screen — a banner pasted on, in
          an app whose footer arrives on a drawn wave. The same wave,
          with the page's own colour coming in below the crest. */}
      {bleed ? <Seam variant="wave" color={COLORS.darkGrey} /> : null}
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
  bleed: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  /** The picture fades out of existence over the sheet; nothing at the
      bottom edge but the page. Web only: the mask is CSS. */
  fadeOut:
    Platform.OS === 'web'
      ? ({
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,0) 100%)',
        } as unknown as ViewStyle)
      : {},
  /** The shoreline under it carries the foot's air; the copy sits on the crest. */
  copyBleed: { paddingBottom: SPACING.xs },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  copy: {
    padding: SPACING.lg,
    gap: SPACING.xs,
    maxWidth: 560,
  },
  // Full strength: text at an opacity is a contrast nobody measured.
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.lightGrey,
  },
  title: {
    ...TYPE.title,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
  },
  description: {
    ...TYPE.p,
    color: COLORS.lightGrey,
  },
});
