import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { PlatformIcons } from './PlatformIcons';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { Textured } from './Textured';
import { Touchable } from './Touchable';
import { prefetchGame } from '@/api/gameDetail';
import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { artQuery } from '@/api/art';
import { igdbCoverUri } from '@/api/igdb';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { alpha, COLORS } from '@/styles/colors';
import { ICON, LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { FONT_SCALE, OVER_IMAGE, TYPE } from '@/styles/typography';

interface Props {
  game: Game;
  /** Fixed width for horizontal shelves; omit to flex into a grid cell. */
  width?: number;
  /** Small emphasis pill on the art, e.g. a release date. */
  badge?: string;
  /** Position in a top-ten row, drawn on the art. */
  rank?: number;
  /**
   * Poster (box art, 3:4) or wide (screenshot, 16:9). Wide rows exist
   * to break the rhythm of a page of posters, and they show the
   * screenshot rather than the cover because that is the shape it is.
   */
  shape?: 'poster' | 'wide';
  /**
   * The hours set as a figure rather than a label: for the row whose
   * whole argument is how long its games take.
   */
  bigHours?: boolean;
}

/**
 * Cover-art tile. The art carries glanceable facts — Metacritic in the top
 * corner, and on a desk the platform glyphs along the bottom — and the
 * caption carries the hours, then identity. On pointer hover the art
 * cycles through the game's actual screenshots, and a quick-save control
 * appears.
 */
export function GameTile({
  game,
  width,
  badge,
  rank,
  shape = 'poster',
  bigHours = false,
}: Props) {
  const router = useRouter();
  const { statusOf, setStatus } = useLibrary();
  const { durationOf, coverOf, learnDurations } = useDurations();
  const { isCompact } = useBreakpoint();
  // Each tile asks after its own game; the provider collects a beat and
  // sends one batch for the whole shelf. Idempotent, so a screen that
  // already asked costs nothing.
  useEffect(() => {
    if (game.slug) learnDurations([game]);
  }, [game, learnDurations]);
  const toast = useToast();
  const [hovered, setHovered] = useState(false);
  const queryClient = useQueryClient();
  // Warm the page you are about to open. By the time the tap lands the
  // detail query is usually already resolved, so the screen arrives with
  // content instead of bones.
  const prefetch = () => prefetchGame(queryClient, game);
  const [shot, setShot] = useState(0);

  const saved = statusOf(game.id) != null;
  /**
   * The box art fronts the tile; the screenshots stay behind it as the
   * hover reel. IGDB knows most games' covers and none of ours until
   * the batch answer lands, so the RAWG art holds the frame first and
   * the cover takes over when it arrives - same crossfade either way.
   */
  const cover = shape === 'wide' ? null : coverOf(game.slug);
  /**
   * The second place box art can come from, asked only once the first
   * has said no. IGDB covers most of the catalogue; for the rest,
   * SteamGridDB's community grids and Valve's own library art turn a
   * typed quest card back into a box on the shelf. Keyed by slug and
   * cached for a week, so a shelf that repeats a game asks once.
   */
  const { data: art } = useQuery({
    ...artQuery(game),
    enabled: shape === 'poster' && cover === null && Boolean(game.slug),
  });
  const grid = cover === null ? art?.grid : null;
  // The 267px cut suits a phone's tile; a desk tile at 220 points wants
  // the 600px file.
  const gridUri = grid ? (isCompact ? grid.thumb : grid.url) : null;
  const boxArt = cover ? igdbCoverUri(cover) : gridUri;
  /**
   * The card face carries the title only, the way printed box art
   * does - and like box art, the caption below repeats it. Hours and
   * meta live in the caption alone, so every tile in a row keeps the
   * same grammar and the same baselines whether it has a cover or not;
   * a first cut put them on the face and suppressed the caption, and a
   * mixed row read as two different components side by side.
   */
  const questCard = shape === 'poster' && !boxArt;
  // Undefined is "not yet": the plate stands bare until IGDB answers —
  // and, after a miss there, until SteamGridDB has — and only a settled
  // miss from both earns the quest card's name.
  const awaitingCover =
    shape === 'poster' &&
    (cover === undefined || (cover === null && art === undefined));
  const images = [
    boxArt ?? game.background_image,
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
  /**
   * How long it takes, on a line of its own, before the name.
   *
   * Every tile on this page used to read "Adventure · 2026 · ★ 3.6" —
   * RAWG's facts, the same three any games site would print — and when
   * the hours did arrive they were 11pt, second in line, behind the
   * title. The number this app exists to tell you now leads the caption
   * in the time colour. Where the length is genuinely unknown the
   * rating takes the line instead, because then it is the only signal
   * there is — in the neutral grey a rating deserves, not in amber.
   */
  const { hours } = durationOf(game);
  const length = hours > 0 ? formatHours(hours) : null;
  const rating = !length && game.rating > 0 ? game.rating.toFixed(1) : null;
  // One fact under the name, not three: the genre, or the year when
  // there is no genre to give.
  const fact = genre ?? year;

  /**
   * The platform glyphs are a desk's detail. On a phone tile they were
   * four overlays on a 150pt frame and the reason for a 65% black
   * gradient across the art; the game page answers "is it on my
   * Switch?", and the tile keeps two overlays — save and score.
   */
  const platforms =
    !isCompact && rank == null ? (game.parent_platforms ?? []) : [];
  const heavyScrim = rank != null || platforms.length > 0;

  const open = () => router.push(`/game/${game.id}`);
  const toggleSave = () => {
    const previous = statusOf(game.id);
    setStatus(game, previous ? null : 'wishlist');
    // A save is one tap on a control the size of a thumbnail, so it
    // is one tap to take back — and taking back a removal restores the
    // status it had, not a fresh "want to play".
    toast(
      previous ? 'Removed from library' : 'Saved — Want to play',
      previous ? 'bookmark-outline' : 'bookmark',
      {
        label: 'Undo',
        onPress: () => setStatus(game, previous),
      }
    );
  };

  /**
   * One sentence for VoiceOver, in the order the tile is read: the name,
   * how long it takes, what kind of thing it is.
   */
  const spoken = [
    game.name,
    length ? `${spokenHours(hours)} to finish` : null,
    rating ? `rated ${rating} of 5` : null,
    genre,
    rank != null ? `number ${rank}` : null,
    saved ? 'in your library' : null,
  ]
    .filter(Boolean)
    .join(', ');
  const saveLabel = saved ? 'Remove from library' : 'Save to library';

  return (
    <View
      style={width != null ? { width } : styles.flexCell}
      testID={`game-tile-${game.id}`}
      onPointerEnter={() => {
        setHovered(true);
        prefetch();
      }}
      onPointerLeave={() => {
        setHovered(false);
        setShot(0);
      }}
    >
      {/* The tile is one control and the save is another, side by side.
          The save used to sit inside the tile's button, and iOS folds
          everything inside a button into one element — so VoiceOver
          could open the game but never reach its save. Siblings are two
          stops, and the tile also offers Save as an action from its own
          rotor. */}
      <ScaleButton
        onPress={open}
        onPressIn={prefetch}
        style={styles.tile}
        activeScale={0.97}
        hoverScale={1.03}
        accessibilityLabel={spoken}
        accessibilityActions={[
          { name: 'activate' },
          { name: 'save', label: saved ? 'Remove from library' : 'Save' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'save') toggleSave();
          else if (event.nativeEvent.actionName === 'activate') open();
        }}
      >
        <View
          style={[
            styles.art,
            shape === 'wide' && styles.artWide,
            hovered && styles.artHovered,
          ]}
        >
          {questCard && shot === 0 ? (
            /* The quest card: what a game with no box art gets.

               A screenshot cropped to portrait is a poster pretending -
               HUD text, a gameplay frame, the tell of a gap in the
               data. The brand's own material does better: the plate,
               its texture, the title set in the display face, and the
               hours in the one colour this app reserves for time. The
               gap becomes the most Sidequest-looking object on the
               shelf, and the cover crossfades over it if one arrives. */
            <View style={styles.questCard}>
              <Textured fill />
              {/* Hidden from assistive tech: the caption below already
                  announces the name, and box art is decoration when a
                  label sits under it. */}
              {awaitingCover ? null : (
                <Text
                  style={styles.questName}
                  numberOfLines={3}
                  maxFontSizeMultiplier={FONT_SCALE.display}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {game.name}
                </Text>
              )}
            </View>
          ) : (
            <>
              <CoverImage
                uri={images[shot] ?? null}
                // The screenshot we already have, if the cover will not
                // load. It cannot rescue a request that hangs rather
                // than fails, but a cover that genuinely errors leaves
                // the tile showing art instead of an empty plate.
                fallbackUri={shot === 0 ? game.background_image : null}
                style={styles.image}
              />
              {/* Only as dark as what sits on it needs. The glyphs and
                  the rank numeral want a real scrim; a bare cover wants
                  just enough at the foot to sit on the page. */}
              <LinearGradient
                colors={heavyScrim ? SCRIM_HEAVY : SCRIM_LIGHT}
                locations={[0.55, 0.8, 1]}
                style={styles.gradient}
                pointerEvents="none"
              />
            </>
          )}
          {/* Light along the box's top edge, above the art. The tile's
              own inset cannot do it: children paint over an inset
              shadow, and the cover is a child. */}
          <View style={styles.edgeLight} pointerEvents="none" />
          {badge ? (
            <View style={styles.badge}>
              <Text
                style={styles.badgeText}
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                {badge}
              </Text>
            </View>
          ) : (
            game.metacritic != null && (
              <View style={styles.scoreCorner}>
                <ScorePill score={game.metacritic} size="sm" />
              </View>
            )
          )}
          {/* The rank takes the bottom-left corner when there is one. As a
              watermark behind the tile it was clipped by the rail's edge
              on the first item and surfaced between tiles on the rest,
              which read as a rendering artifact rather than a top ten. */}
          {rank != null ? (
            <Text style={styles.rank} maxFontSizeMultiplier={FONT_SCALE.figure}>
              {rank}
            </Text>
          ) : platforms.length > 0 ? (
            <View style={styles.platforms}>
              <PlatformIcons
                platforms={platforms.slice(0, 4)}
                size={12}
                color={alpha(COLORS.white, 0.85)}
              />
            </View>
          ) : null}
        </View>
        {/* Always drawn, so a row keeps one baseline: a tile whose
            length has not arrived holds the line open rather than
            lifting its name above its neighbours'. */}
        <Text
          style={[styles.lead, bigHours && styles.leadBig]}
          numberOfLines={1}
          maxFontSizeMultiplier={
            bigHours ? FONT_SCALE.figure : FONT_SCALE.label
          }
        >
          {length ?? (rating ? <Rating value={rating} /> : ' ')}
        </Text>
        <Text
          style={[styles.title, hovered && styles.titleHovered]}
          numberOfLines={2}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          {game.name}
        </Text>
        {fact ? (
          <Text
            style={styles.meta}
            numberOfLines={1}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {fact}
          </Text>
        ) : null}
      </ScaleButton>
      {/* Phones can't hover - the save control must simply be there. */}
      {isCompact || hovered || saved ? (
        <Touchable
          onPress={toggleSave}
          haptic="impact"
          hitSlop="sm"
          accessibilityLabel={saveLabel}
          style={styles.save}
        >
          {/* White and filled once saved. Amber is time, and a bookmark
              is not a length. */}
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={ICON.sm}
            color={COLORS.white}
          />
        </Touchable>
      ) : null}
    </View>
  );
}

/** The rating, with a star the fonts can draw: the faces have no ★. */
function Rating({ value }: { value: string }) {
  return (
    <Text style={styles.rating}>
      <Ionicons name="star" size={ICON.sm} color={COLORS.starGold} />
      {` ${value}`}
    </Text>
  );
}

/** "2.5h" as it is said: "2.5 hours". */
function spokenHours(hours: number): string {
  const figure = formatHours(hours).replace(/h$/, '');
  return `${figure} ${figure === '1' ? 'hour' : 'hours'}`;
}

const SCRIM_HEAVY = [
  alpha(COLORS.ink, 0),
  alpha(COLORS.ink, 0.35),
  alpha(COLORS.ink, 0.65),
] as const;
const SCRIM_LIGHT = [
  alpha(COLORS.ink, 0),
  alpha(COLORS.ink, 0.08),
  alpha(COLORS.ink, 0.25),
] as const;

const styles = StyleSheet.create({
  flexCell: { flex: 1 },
  tile: { gap: SPACING.xxs },
  art: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    marginBottom: SPACING.xs,
    ...SHADOW.card,
  },
  artWide: { aspectRatio: LAYOUT.tileAspectWide },
  artHovered: { borderColor: COLORS.strokeStrong },
  questCard: {
    flex: 1,
    backgroundColor: COLORS.navy,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  questName: {
    ...TYPE.figureSmall,
    color: COLORS.lightGrey,
  },

  image: { width: '100%', height: '100%' },
  edgeLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.sm - 1,
    boxShadow: `inset 0 1px 0 ${alpha(COLORS.white, 0.14)}`,
  },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scoreCorner: { position: 'absolute', top: SPACING.sm, right: SPACING.sm },
  badge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  badgeText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
  /**
   * Over the art's top-left corner, as a sibling of the tile rather than
   * a child of it. Twenty-eight points drawn, forty-four to the thumb.
   */
  save: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    /**
     * Quieter than it was. A phone cannot hover, so this control is on
     * every tile all the time — at full strength that is six hard black
     * discs down one screen, and they read as the loudest thing on a
     * page made of artwork.
     */
    backgroundColor: alpha(COLORS.ink, 0.42),
    alignItems: 'center',
    justifyContent: 'center',
  },
  platforms: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm2,
  },
  rank: {
    ...TYPE.hero,
    position: 'absolute',
    /*
     * Inside the frame, which is the whole reason it was moved here.
     *
     * It was a watermark behind the tile once, clipped by the rail's
     * edge on the first item, and it came in here to stop being cut.
     * Then it was hung six points below the bottom — and the frame
     * clips, so it was cut again: measured on the built site, the
     * text box overhung the frame by five pixels, which takes the
     * round foot off a 5 or a 6 and leaves a 1 or a 7 looking fine.
     * That is what makes it read as a rendering fault rather than a
     * style. Two points up from the edge puts the whole glyph in.
     */
    bottom: SPACING.xxs,
    left: SPACING.sm,
    color: COLORS.white,
    ...OVER_IMAGE.heading,
  },
  /** The hours: the tile's lead, in the one colour kept for time. */
  lead: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
  leadBig: {
    ...TYPE.figureSmall,
    color: COLORS.accent,
  },
  /** A rating standing in for unknown hours: a fact, not a verdict. */
  rating: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  title: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    // Two lines held open, so a row of long and short names keeps one
    // baseline for the fact beneath them.
    minHeight: TYPE.labelSmall.lineHeight * 2,
  },
  titleHovered: { color: COLORS.white },
  meta: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
});
