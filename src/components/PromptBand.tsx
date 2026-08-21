import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { GrainScrim } from './Textured';
import { useHydrated } from '@/hooks/useHydrated';
import { remainingHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { buildPrompt } from '@/lib/prompt';
import { COLORS } from '@/styles/colors';
import { GUTTER, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The page, halfway down, in its own voice.
 *
 * Below the stage this was five rows of the same shape — tiles, caption,
 * tiles, caption — for the length of the document. The monotony is not
 * only dull: it says everything here is the same kind of thing, when one
 * of these rows is about you and the rest are a shop.
 *
 * So this band is deliberately not a row. No artwork, no tiles, no
 * horizontal scroll: a colour field with one sentence set large. It
 * breaks the rhythm because it is a different kind of statement, and the
 * break is the point.
 *
 * Gated on hydration, and not optionally — the library lives in storage,
 * so the pre-rendered HTML has no idea how many games are in it.
 */
export function PromptBand({ inset = GUTTER }: { inset?: number }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { entries } = useLibrary();
  const { durationOf } = useDurations();

  const library = useMemo(() => Object.values(entries), [entries]);
  const prompt = useMemo(
    () =>
      hydrated
        ? buildPrompt(library, (entry) =>
            remainingHours(durationOf(entry.game).hours, {
              hoursPlayed: entry.hoursPlayed,
              playing: entry.status === 'playing',
            })
          )
        : null,
    [hydrated, library, durationOf]
  );

  if (!prompt) return null;

  return (
    <View style={[styles.band, { marginHorizontal: -inset }]}>
      <LinearGradient
        colors={[COLORS.navy, '#2A3348', COLORS.darkGrey]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={StyleSheet.absoluteFill} />
      <View style={[styles.copy, { paddingHorizontal: inset }]}>
        <Text style={styles.eyebrow}>{prompt.eyebrow.toUpperCase()}</Text>
        <Text style={styles.headline}>{prompt.headline}</Text>
        <Text style={styles.detail}>{prompt.detail}</Text>
        <ScaleButton
          onPress={() => router.push(prompt.href)}
          style={styles.action}
          activeScale={0.96}
          hoverScale={1.03}
          accessibilityLabel={prompt.action}
        >
          <Text style={styles.actionLabel}>{prompt.action}</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
        </ScaleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.stroke,
  },
  copy: {
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
    maxWidth: 560,
  },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  headline: {
    ...TYPE.title,
    color: COLORS.white,
    marginTop: 2,
  },
  detail: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 11,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  actionLabel: {
    ...TYPE.label,
    color: COLORS.accent,
  },
});
