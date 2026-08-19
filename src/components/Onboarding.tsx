import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverImage } from './CoverImage';
import { FadeInView } from './FadeInView';
import { Textured } from './Textured';
import { queryKeys } from '@/api/queryClient';
import type { Game, Paged } from '@/api/types';
import { DISCOVER } from '@/constants/categories';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deliberate: hydration handshake, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const trending = useQuery({
    queryKey: queryKeys.shelf(DISCOVER[0].key),
    queryFn: () => DISCOVER[0].fetch(1),
    select: (page: Paged<Game>) => page.results,
    enabled: mounted && !done,
  });
  const picks: Game[] = (trending.data ?? []).slice(0, PICKS);

  if (!mounted || done) return null;

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
      <Pressable onPress={() => setStep(1)} style={styles.cta}>
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
      <Pressable onPress={() => finish(savedCount > 0)} style={styles.cta}>
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
        <Text style={styles.watermark} numberOfLines={1}>
          SIDEQUEST
        </Text>

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

        <View style={[styles.stage, { width: contentWidth }]}>
          <FadeInView key={step}>{acts[step]}</FadeInView>
        </View>

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
    backgroundColor: COLORS.darkGrey,
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
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    color: COLORS.mediumGrey,
    padding: SPACING.sm,
  },
  stage: { maxWidth: 460 },
  act: { gap: SPACING.md, alignItems: 'flex-start' },
  eyebrow: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    letterSpacing: 2.4,
    color: COLORS.mediumGrey,
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 26,
    letterSpacing: 1.5,
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  actLabel: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    letterSpacing: 2.4,
    color: COLORS.accent,
  },
  display: {
    fontFamily: 'Noah-Black',
    fontSize: 34,
    lineHeight: 40,
    color: COLORS.white,
  },
  lede: {
    fontFamily: 'Noah-Regular',
    fontSize: 14.5,
    lineHeight: 22,
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
  ctaText: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    color: COLORS.darkGrey,
  },
  quiet: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  paceCardSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  paceBody: { flex: 1, gap: 1 },
  paceTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 14.5,
    color: COLORS.lightGrey,
  },
  paceTitleSelected: { color: COLORS.darkGrey },
  paceLine: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  paceLineSelected: { color: 'rgba(30,36,50,0.7)' },
  paceHours: {
    fontFamily: 'Noah-Black',
    fontSize: 13,
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
    fontFamily: 'Noah-Bold',
    fontSize: 11,
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
