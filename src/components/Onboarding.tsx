import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { CoverImage } from './CoverImage';
import { FadeInView } from './FadeInView';
import { Textured } from './Textured';
import { queryKeys } from '@/api/queryClient';
import type { Game, Paged } from '@/api/types';
import { DISCOVER } from '@/constants/categories';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The covers, as the first screen's other half.
 *
 * On a phone the welcome is a column and that is the right shape. On a
 * desktop the same column sat in the middle of fourteen hundred pixels
 * of nothing — a mobile layout on a monitor, and, in an app about
 * games, a first impression containing no games at all.
 *
 * Two staggered columns of real artwork, dimmed and fading out towards
 * the copy so the words stay the subject. It is the app's own content,
 * which is the only honest thing to put here.
 */
function CoverWall({ games }: { games: Game[] }) {
  if (games.length < 4) return null;
  const columns = [games.slice(0, 3), games.slice(3, 6)];

  return (
    <View style={styles.wall} pointerEvents="none">
      {columns.map((column, index) => (
        <View
          key={index}
          style={[styles.wallColumn, index === 1 && styles.wallColumnOffset]}
        >
          {column.map((game) => (
            <CoverImage
              key={game.id}
              uri={game.background_image}
              style={styles.wallCover}
              size="tile"
              iconSize={24}
            />
          ))}
        </View>
      ))}
      {/* The words are the subject; the wall arrives out of them. */}
      <LinearGradient
        colors={[COLORS.navy, 'rgba(39,47,63,0.65)', 'rgba(39,47,63,0)']}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const PACES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  line: string;
  hours: number;
}[] = [
  {
    icon: 'moon',
    title: 'A couple of evenings',
    line: 'Work, life, and the occasional boss fight.',
    hours: 4,
  },
  {
    icon: 'game-controller',
    title: 'Most nights',
    line: 'A steady hour or two once the day winds down.',
    hours: 8,
  },
  {
    icon: 'flash',
    title: 'It’s my main thing',
    line: 'Weekends were invented for this.',
    hours: 15,
  },
];

/**
 * Routes that must never be covered by the setup flow: the pages whose
 * whole job is to be read by somebody who has not started yet.
 */
const PUBLIC_ROUTES = ['/about', '/privacy', '/terms', '/shared'];

/** How many games act three offers for the first saves. */
const PICKS = 6;

function PickTile({
  game,
  saved,
  onToggle,
  width,
}: {
  game: Game;
  saved: boolean;
  onToggle: () => void;
  width: number;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.pick, { width }, saved && styles.pickSaved]}
      accessibilityRole="button"
      accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${game.name}`}
    >
      <CoverImage uri={game.background_image} style={styles.pickArt} />
      <View style={[styles.pickBadge, saved && styles.pickBadgeSaved]}>
        <Ionicons
          name={saved ? 'checkmark' : 'add'}
          size={14}
          color={saved ? COLORS.darkGrey : COLORS.white}
        />
      </View>
      <Text style={styles.pickName} numberOfLines={1}>
        {game.name}
      </Text>
    </Pressable>
  );
}

/**
 * First visit: three short acts instead of a brochure. The promise, then
 * your real pace (it seeds The Plan), then a handful of trending games to
 * save — so the product is already personal before the first browse.
 * Shows once, skippable at every step, persisted.
 */
export function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setStatus, statusOf } = useLibrary();

  const [done, setDone] = usePersistedState('sidequest.onboarded.v1', false);
  const [, setPlanPace] = usePersistedState('sidequest.plan.pace', 6);
  const [step, setStep] = useState(0);
  const [pace, setPace] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const mounted = useHydrated();
  const { isExpanded } = useBreakpoint();
  const pathname = usePathname();

  /**
   * The pages that exist for people who have not used this yet.
   *
   * A stranger following a link to the about page is being asked to
   * decide whether to try Sidequest at all, and covering that page with
   * a setup flow answers a question they have not asked. The same goes
   * for the legal pages, which people reach on purpose and from
   * elsewhere.
   */
  const readingAbout = PUBLIC_ROUTES.some((route) => pathname === route);

  const trending = useQuery({
    queryKey: queryKeys.shelf(DISCOVER[0].key),
    queryFn: () => DISCOVER[0].fetch(1),
    select: (page: Paged<Game>) => page.results,
    enabled: mounted && !done,
  });
  const picks: Game[] = (trending.data ?? []).slice(0, PICKS);

  if (!mounted || done || readingAbout) return null;

  const finish = (toPlan: boolean) => {
    setDone(true);
    if (toPlan) router.push('/plan');
  };

  const contentWidth = Math.min(width - SPACING.lg * 2, 460);
  const tileWidth = (contentWidth - SPACING.sm * 2) / 3;

  const acts = [
    // -------------------------------------------------- act 1: the hook
    <View key="hook" style={styles.act}>
      <Text style={styles.eyebrow}>WELCOME TO</Text>
      <Text style={styles.wordmark}>SIDEQUEST</Text>
      <Text style={styles.display}>Your backlog isn’t{'\n'}a to-do list.</Text>
      <Text style={styles.lede}>
        Sidequest finds your next game, works out what you can actually finish —
        and gives you permission to skip the rest.
      </Text>
      <Pressable
        onPress={() => setStep(1)}
        style={[styles.cta, isExpanded && styles.ctaInline]}
      >
        <Text style={styles.ctaText}>Set me up — 20 seconds</Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.darkGrey} />
      </Pressable>
      <Pressable onPress={() => finish(false)}>
        <Text style={styles.quiet}>Skip the tour</Text>
      </Pressable>
    </View>,

    // -------------------------------------------------- act 2: your pace
    <View key="pace" style={styles.act}>
      <Text style={styles.actLabel}>YOUR PACE</Text>
      <Text style={styles.display}>How much do{'\n'}you really play?</Text>
      <Text style={styles.lede}>
        Be honest — this is what makes the plan trustworthy.
      </Text>
      <View style={styles.paceList}>
        {PACES.map((option) => {
          const selected = pace === option.hours;
          return (
            <Pressable
              key={option.hours}
              onPress={() => {
                setPace(option.hours);
                setPlanPace(option.hours);
                setTimeout(() => setStep(2), 260);
              }}
              style={[styles.paceCard, selected && styles.paceCardSelected]}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={selected ? COLORS.darkGrey : COLORS.mediumGrey}
              />
              <View style={styles.paceBody}>
                <Text
                  style={[
                    styles.paceTitle,
                    selected && styles.paceTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>
                <Text
                  style={[styles.paceLine, selected && styles.paceLineSelected]}
                >
                  {option.line}
                </Text>
              </View>
              <Text
                style={[styles.paceHours, selected && styles.paceTitleSelected]}
              >
                ~{option.hours}h
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.quiet}>
        You can tune this later — or measure it from Steam.
      </Text>
    </View>,

    // -------------------------------------------------- act 3: first saves
    <View key="picks" style={styles.act}>
      <Text style={styles.actLabel}>FIRST SAVES</Text>
      <Text style={styles.display}>
        Been meaning to{'\n'}play any of these?
      </Text>
      <Text style={styles.lede}>
        Tap to save — they become your first plan. Or skip; the bookmark is
        everywhere.
      </Text>
      <View style={styles.pickGrid}>
        {picks.map((game) => {
          const saved = statusOf(game.id) === 'wishlist';
          return (
            <PickTile
              key={game.id}
              game={game}
              saved={saved}
              width={tileWidth}
              onToggle={() => {
                setStatus(game, saved ? null : 'wishlist');
                setSavedCount((count) => count + (saved ? -1 : 1));
              }}
            />
          );
        })}
      </View>
      <Pressable
        onPress={() => finish(savedCount > 0)}
        style={[styles.cta, isExpanded && styles.ctaInline]}
      >
        <Text style={styles.ctaText}>
          {savedCount > 0
            ? `Build my plan — ${savedCount} saved`
            : 'Start exploring'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={COLORS.darkGrey} />
      </Pressable>
    </View>,
  ];

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => finish(false)}
    >
      <Textured style={styles.screen}>
        {/* No numberOfLines on the watermark: react-native-web renders
            that as text-overflow ellipsis, which at 128px is three
            giant dots. One unbreakable word cannot wrap, and the
            parent already clips. */}
        {!isExpanded && <Text style={styles.watermark}>SIDEQUEST</Text>}

        <View style={[styles.chrome, { top: insets.top + SPACING.md }]}>
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityLabel="Back"
              style={styles.chromeButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={COLORS.mediumGrey}
              />
            </Pressable>
          ) : (
            <View style={styles.chromeButton} />
          )}
          <Pressable onPress={() => finish(false)}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        {isExpanded ? (
          <View style={styles.split}>
            <View style={styles.copyColumn}>
              <FadeInView key={step}>{acts[step]}</FadeInView>
            </View>
            <CoverWall games={trending.data ?? []} />
          </View>
        ) : (
          <View style={[styles.stage, { width: contentWidth }]}>
            <FadeInView key={step}>{acts[step]}</FadeInView>
          </View>
        )}

        <View style={[styles.dots, { bottom: insets.bottom + SPACING.xl }]}>
          {acts.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step && styles.dotActive]}
            />
          ))}
        </View>
      </Textured>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    /**
     * The same ground as every other screen, exactly.
     *
     * This was darkGrey — one step lighter than the app's navy — and
     * onboarding was the only page on it. The iOS toolbar takes its
     * colour from the page, so the first screen anyone ever sees was
     * also the only one where the browser chrome and the page did not
     * match. The welcome mat cannot be the one tile laid in the wrong
     * colour.
     */
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    bottom: -30,
    right: -12,
    fontFamily: 'Noah-Black',
    fontSize: 150,
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.03)',
  },
  chrome: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  chromeButton: { width: 36, height: 36, justifyContent: 'center' },
  skip: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
    padding: SPACING.sm,
  },
  stage: { maxWidth: 460 },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1180,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
  },
  copyColumn: { width: 480, flexShrink: 0, zIndex: 2 },
  wall: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  wallColumn: { gap: SPACING.md, flex: 1, maxWidth: 240 },
  /** Staggered, so it reads as a wall rather than a table. */
  wallColumnOffset: { marginTop: SPACING.xl * 2 },
  wallCover: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    opacity: 0.75,
  },
  act: { gap: SPACING.md, alignItems: 'flex-start' },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.mediumGrey,
  },
  wordmark: {
    ...TYPE.title,
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  actLabel: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  display: {
    ...TYPE.display,
    color: COLORS.white,
  },
  lede: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 1,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.white,
    alignSelf: 'stretch',
    marginTop: SPACING.sm,
  },
  /**
   * On a phone a full-width button is the target you want. Stretched
   * across a desktop copy column it is a 660px pill, which reads as a
   * banner rather than as something to press.
   */
  ctaInline: { alignSelf: 'flex-start' },
  ctaText: {
    ...TYPE.h3,
    color: COLORS.darkGrey,
  },
  quiet: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    alignSelf: 'center',
    padding: SPACING.xs,
  },

  // act 2
  paceList: { gap: SPACING.sm, alignSelf: 'stretch' },
  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.raised,
  },
  paceCardSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  paceBody: { flex: 1, gap: 1 },
  paceTitle: {
    ...TYPE.h4,
    color: COLORS.lightGrey,
  },
  paceTitleSelected: { color: COLORS.darkGrey },
  paceLine: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  paceLineSelected: { color: 'rgba(30,36,50,0.7)' },
  paceHours: {
    ...TYPE.h4,
    color: COLORS.mediumGrey,
  },

  // act 3
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignSelf: 'stretch',
  },
  pick: { gap: 4 },
  pickSaved: {},
  pickArt: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  pickBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(13,17,25,0.72)',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBadgeSaved: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  pickName: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
  },

  dots: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: { backgroundColor: COLORS.white, width: 18 },
});
