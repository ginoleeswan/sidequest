import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { Rise } from './Rise';
import { Words } from './Words';
import { queryKeys } from '@/api/queryClient';
import { getMustPlayGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { COLORS } from '@/styles/colors';
import type { LandingScale } from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Where to get it — which for this app is a sentence, said proudly.
 *
 * Store pages get a section like this because the store is a detour:
 * badge, store, download, account. Sidequest's version has to explain
 * that there is no detour, and the way to make "it is just a link"
 * read as a feature rather than an apology is to give it the same
 * ceremony a store launch gets: the app shown at its best in a device,
 * and the two real ways to keep it.
 *
 * The phone is drawn, not photographed — a stroked frame around the
 * app's actual components fed actual games, because a mockup with a
 * screenshot in it goes stale the week after it is taken, and this one
 * is rendered by the same code it is advertising.
 */

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

export function LandingTake({ scale }: { scale: LandingScale }) {
  /**
   * The same shelf the demo band draws from — one cache entry between
   * them, so this section costs no second request and the phone shows
   * games a stranger has actually heard of.
   */
  const { data: games = [] } = useQuery({
    queryKey: queryKeys.shelf('landing-try'),
    queryFn: () => getMustPlayGames(1),
    select: (paged: Paged<Game>) => paged.results,
    staleTime: 6 * 60 * 60 * 1000,
  });
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const lead = games[0];
  const shelf = games.slice(1, 4);

  return (
    <View style={[styles.section, scale.wide && styles.sectionWide]}>
      <View style={scale.wide ? styles.copyWide : undefined}>
        <Rise from="mask">
          <Text style={styles.eyebrow}>No store. No account. No download.</Text>
        </Rise>
        <Words
          text="Take it with you."
          style={[styles.lead, scale.lead]}
          delay={60}
        />
        <Rise delay={220}>
          <View style={styles.badges}>
            {/* The two honest "store badges" this product can have. */}
            <View style={styles.badge}>
              <Ionicons
                name="share-outline"
                size={22}
                color={COLORS.lightGrey}
              />
              <View>
                <Text style={styles.badgeSmall}>On iPhone & iPad</Text>
                <Text style={styles.badgeBig}>Share → Add to Home Screen</Text>
              </View>
            </View>
            <Pressable
              style={[styles.badge, event && styles.badgeLive]}
              disabled={!event}
              onPress={() => event?.prompt()}
              accessibilityRole={event ? 'button' : undefined}
              accessibilityLabel="Install Sidequest"
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={event ? COLORS.navy : COLORS.lightGrey}
              />
              <View>
                <Text
                  style={[styles.badgeSmall, event && styles.badgeSmallLive]}
                >
                  On Android & desktop
                </Text>
                <Text style={[styles.badgeBig, event && styles.badgeBigLive]}>
                  {event ? 'Install Sidequest' : 'Install from the browser'}
                </Text>
              </View>
            </Pressable>
          </View>
        </Rise>
        <Rise delay={300}>
          <Text style={styles.footnote}>
            Full-screen, offline, your library on your device. Or do neither —
            it is a link.
          </Text>
        </Rise>
      </View>

      {/* The app in the hand, drawn by the app. */}
      {lead && (
        <Rise
          from="lift"
          delay={180}
          style={[styles.phoneSlot, scale.wide && styles.phoneSlotWide]}
        >
          <View style={styles.phone}>
            <View style={styles.notch} />
            <Text style={styles.phoneEyebrow}>TONIGHT · 90 MINUTES</Text>
            <CoverImage
              uri={lead.background_image}
              style={styles.phoneHero}
              size="thumb"
            />
            <Text style={styles.phoneTitle} numberOfLines={1}>
              Finish {lead.name}
            </Text>
            <Text style={styles.phoneMeta}>
              You could see the credits before bed.
            </Text>
            <View style={styles.phoneRow}>
              {shelf.map((game) => (
                <CoverImage
                  key={game.id}
                  uri={game.background_image}
                  style={styles.phoneTile}
                  size="thumb"
                />
              ))}
            </View>
          </View>
        </Rise>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.xl },
  sectionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 2,
  },
  copyWide: { flex: 1 },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  lead: { color: COLORS.white, marginTop: SPACING.sm },
  badges: { gap: SPACING.md, marginTop: SPACING.xl, alignSelf: 'flex-start' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    minWidth: 300,
  },
  badgeLive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  badgeSmall: { ...TYPE.caption, fontSize: 12 },
  badgeSmallLive: { color: 'rgba(39,47,63,0.7)' },
  badgeBig: { ...TYPE.h2, color: COLORS.white },
  badgeBigLive: { color: COLORS.navy },
  footnote: { ...TYPE.caption, marginTop: SPACING.lg },

  /**
   * On the lip. The phone hangs a third of itself past the band's
   * bottom edge into the next section — an object standing across the
   * boundary reads as a thing in the world, where one floating mid-band
   * reads as a figure in a document. The band above carries `raise` so
   * this paints over the closing band rather than under it.
   */
  phoneSlot: { alignItems: 'center', marginBottom: -130, zIndex: 1 },
  /**
   * Wide layouts centre the phone against the copy column, whose height
   * sets the band's — so the negative margin that works in the stacked
   * layout moves nothing here. A transform is paint-space, not layout:
   * it carries the phone across the boundary without the band noticing.
   */
  phoneSlotWide: { marginBottom: 0, transform: [{ translateY: 170 }] },
  phone: {
    width: 250,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.strokeStrong,
    backgroundColor: '#161C27',
    padding: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  notch: {
    alignSelf: 'center',
    width: 74,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.strokeStrong,
    marginBottom: SPACING.xs,
  },
  phoneEyebrow: { ...TYPE.tag, color: COLORS.accent },
  phoneHero: {
    width: '100%',
    aspectRatio: 16 / 11,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  phoneTitle: { ...TYPE.h2, color: COLORS.white },
  phoneMeta: { ...TYPE.caption, fontSize: 12 },
  phoneRow: { flexDirection: 'row', gap: SPACING.xs + 2, marginTop: 2 },
  phoneTile: {
    flex: 1,
    aspectRatio: 16 / 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
});
