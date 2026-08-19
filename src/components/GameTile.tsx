import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { PlatformIcons } from './PlatformIcons';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { Textured } from './Textured';
import { gameDetailQuery } from '@/api/gameDetail';
import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  game: Game;
  /** Fixed width for horizontal shelves; omit to flex into a grid cell. */
  width?: number;
  /** Small emphasis pill on the art, e.g. a release date. */
  badge?: string;
}

/**
 * Cover-art tile. The art carries glanceable facts — Metacritic in the top
 * corner, platform glyphs along the bottom — and the caption carries
 * identity. On pointer hover the art cycles through the game's actual
 * screenshots, and a quick-save control appears.
 */
export function GameTile({ game, width, badge }: Props) {
  const router = useRouter();
  const { statusOf, setStatus } = useLibrary();
  const { isCompact } = useBreakpoint();
  const toast = useToast();
  const [hovered, setHovered] = useState(false);
  const queryClient = useQueryClient();
  // Warm the page you are about to open. By the time the tap lands the
  // detail query is usually already resolved, so the screen arrives with
  // content instead of bones.
  const prefetch = () =>
    queryClient.prefetchQuery({
      ...gameDetailQuery(game.id),
      staleTime: 5 * 60 * 1000,
    });
  const [shot, setShot] = useState(0);

  const saved = statusOf(game.id) != null;
  const images = [
    game.background_image,
    ...(game.short_screenshots ?? [])
      .map((s) => s.image)
      .filter((uri) => uri && uri !== game.background_image)
      .slice(0, 4),
  ].filter(Boolean) as string[];

  // Cycle screenshots while hovered — a living preview of the game itself.
  useEffect(() => {
    if (!hovered || images.length < 2) return;
    const timer = setInterval(
      () => setShot((i) => (i + 1) % images.length),
      1100
    );
    return () => clearInterval(timer);
  }, [hovered, images.length]);

  const year = game.released?.slice(0, 4);
  const genre = game.genres?.[0]?.name;
  const meta = [
    genre,
    year,
    game.rating > 0 ? `★ ${game.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={width != null ? { width } : styles.flexCell}
      onPointerEnter={() => {
        setHovered(true);
        prefetch();
      }}
      onPointerLeave={() => {
        setHovered(false);
        setShot(0);
      }}
    >
      <ScaleButton
        onPress={() => router.push(`/game/${game.id}`)}
        onPressIn={prefetch}
        style={styles.tile}
        activeScale={0.97}
        hoverScale={1.03}
      >
        <View style={[styles.art, hovered && styles.artHovered]}>
          <CoverImage uri={images[shot] ?? null} style={styles.image} />
          <Textured fill />
          <LinearGradient
            colors={['#00000000', '#00000059', '#000000a6']}
            locations={[0.55, 0.8, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : (
            game.metacritic != null && (
              <View style={styles.scoreCorner}>
                <ScorePill score={game.metacritic} size="sm" />
              </View>
            )
          )}
          {/* Phones can't hover - the save control must simply be there. */}
          {(isCompact || hovered || saved) && (
            <Pressable
              onPress={() => {
                setStatus(game, saved ? null : 'wishlist');
                toast(
                  saved ? 'Removed from library' : 'Saved — Want to play',
                  saved ? 'bookmark-outline' : 'bookmark'
                );
              }}
              hitSlop={6}
              accessibilityLabel={
                saved ? 'Remove from library' : 'Save to library'
              }
              style={styles.saveCorner}
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={saved ? COLORS.accent : COLORS.white}
              />
            </Pressable>
          )}
          {game.parent_platforms && game.parent_platforms.length > 0 && (
            <View style={styles.platforms}>
              <PlatformIcons
                platforms={game.parent_platforms.slice(0, 4)}
                size={12}
                color="rgba(255,255,255,0.85)"
              />
            </View>
          )}
        </View>
        <Text
          style={[styles.title, hovered && styles.titleHovered]}
          numberOfLines={1}
        >
          {game.name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  flexCell: { flex: 1 },
  tile: { gap: SPACING.xs + 1 },
  art: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    ...SHADOW.card,
  },
  artHovered: { borderColor: COLORS.strokeStrong },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scoreCorner: { position: 'absolute', top: SPACING.sm, right: SPACING.sm },
  badge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    ...TYPE.h4,
    color: COLORS.darkGrey,
  },
  saveCorner: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platforms: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm + 2,
  },
  title: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    marginTop: 2,
  },
  titleHovered: { color: COLORS.white },
  meta: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
});
