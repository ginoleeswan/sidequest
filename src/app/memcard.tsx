import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { Memcard } from '@/components/Memcard';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { buildMemcard, memcardYears } from '@/lib/memcard';
import { shareMemcard } from '@/lib/memcardImage';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The year, as a memory card.
 *
 * Every other year-in-review celebrates volume, which is a flex only if
 * you had the time. This one celebrates finishing — because for someone
 * with an hour a night, seeing the credits twice in a year is the
 * achievement, and nothing else tells them so.
 */
export default function MemcardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { entries } = useLibrary();
  const { durationOf } = useDurations();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => Object.values(entries), [entries]);
  const years = useMemo(() => memcardYears(all), [all]);
  const [thisYear] = useState(() => new Date().getFullYear());
  const [year, setYear] = useState<number | null>(null);
  const shown = year ?? years[0] ?? thisYear;

  const card = useMemo(
    () => buildMemcard(all, (game) => durationOf(game).hours, shown),
    [all, durationOf, shown]
  );

  const save = async () => {
    setBusy(true);
    try {
      const how = await shareMemcard(card);
      toast(
        how === 'shared' ? 'Card shared' : 'Card saved to your downloads',
        'image'
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'The card could not be made',
        'alert-circle'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Textured style={styles.background}>
      <PageTitle>{`Your ${shown} — Sidequest`}</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <View
        style={[
          styles.inner,
          {
            paddingTop: isExpanded
              ? SPACING.xl * 1.5
              : insets.top + SPACING.xl * 2,
          },
        ]}
      >
        <SectionHeader title="Your Memcard" eyebrow={`${shown}`} />
        <Text style={styles.lede}>
          One block per game you finished. Not how much you played — what you
          saw the end of.
        </Text>

        {years.length > 1 && (
          <View style={styles.years}>
            {years.map((option) => (
              <Chip
                key={option}
                title={String(option)}
                selected={option === shown}
                onPress={() => setYear(option)}
              />
            ))}
          </View>
        )}

        {card.count === 0 ? (
          <Message
            icon="albums-outline"
            title="No credits rolled yet"
            detail="Finish a game and it takes a block here. One short game is all it takes."
            actionLabel="Find something short"
            onAction={() => router.push('/plan')}
          />
        ) : (
          <>
            <Memcard card={card} maxWidth={LAYOUT.maxContentWidth} />
            {Platform.OS === 'web' && (
              <Pressable
                onPress={save}
                disabled={busy}
                style={[styles.save, busy && styles.saveBusy]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="share-outline"
                  size={16}
                  color={COLORS.darkGrey}
                />
                <Text style={styles.saveText}>
                  {busy ? 'Drawing…' : 'Save or share this card'}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
      <SiteFooter />
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  lede: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  saveBusy: { opacity: 0.6 },
  saveText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
