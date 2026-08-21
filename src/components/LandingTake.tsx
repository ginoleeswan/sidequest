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

/** A phone's real proportions, and the bezel around its screen. */
const PHONE_W = 244;
const BEZEL = 9;

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
  // Two, not three: the third row ran under the tab bar. A screen is a
  // fixed height and its content has to fit it, same as the real one.
  const week = games.slice(4, 6);

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
                size={28}
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
                size={28}
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

      {/* The app in the hand, drawn by the app.
          A real device, not a card with a pill on it: tall as a phone
          actually is, a bezel with a screen inset inside it, a dynamic
          island, side buttons, a status bar and a home indicator. The
          previous version was a rounded rectangle of the right width
          and half the right height, and read as a widget. */}
      {lead && (
        <Rise
          from="lift"
          delay={180}
          style={[styles.phoneSlot, scale.wide && styles.phoneSlotWide]}
        >
          <View style={styles.stage}>
            {/* Cover art in the air around it, the way the memcard's
                pieces fly — the section's own objects giving the
                composition somewhere to breathe. */}
            {shelf[0] && (
              <View style={[styles.floater, styles.floaterLeft]}>
                <CoverImage
                  uri={shelf[0].background_image}
                  style={styles.floaterArt}
                  size="thumb"
                />
              </View>
            )}
            {shelf[1] && (
              <View style={[styles.floater, styles.floaterRight]}>
                <CoverImage
                  uri={shelf[1].background_image}
                  style={styles.floaterArt}
                  size="thumb"
                />
              </View>
            )}

            <View style={styles.device}>
              <View style={[styles.side, styles.sideVolumeUp]} />
              <View style={[styles.side, styles.sideVolumeDown]} />
              <View style={[styles.side, styles.sidePower]} />

              <View style={styles.screen}>
                <View style={styles.statusBar}>
                  <Text style={styles.statusTime}>9:41</Text>
                  <View style={styles.statusIcons}>
                    {[5, 7, 9, 11].map((h) => (
                      <View key={h} style={[styles.bar, { height: h }]} />
                    ))}
                    <View style={styles.battery}>
                      <View style={styles.batteryFill} />
                    </View>
                  </View>
                </View>

                {/* No browser chrome anywhere in this drawing: that is
                    the whole claim of the section. */}
                <View style={styles.app}>
                  <Text style={styles.appEyebrow}>TONIGHT · 90 MINUTES</Text>
                  <CoverImage
                    uri={lead.background_image}
                    style={styles.appHero}
                    size="thumb"
                  />
                  <Text style={styles.appTitle} numberOfLines={2}>
                    Finish {lead.name}
                  </Text>
                  <Text style={styles.appMeta}>
                    You could see the credits before bed.
                  </Text>
                  <View style={styles.appRow}>
                    {shelf.map((game) => (
                      <CoverImage
                        key={game.id}
                        uri={game.background_image}
                        style={styles.appTile}
                        size="thumb"
                      />
                    ))}
                  </View>

                  {/* A screen that stops half way down is a mock-up; a
                      real one runs to the bar. */}
                  <Text style={styles.appSection}>THE WEEK</Text>
                  {week.map((game, index) => (
                    <View key={game.id} style={styles.appLine}>
                      <CoverImage
                        uri={game.background_image}
                        style={styles.appLineArt}
                        size="thumb"
                      />
                      <View style={styles.appLineBody}>
                        <Text style={styles.appLineName} numberOfLines={1}>
                          {game.name}
                        </Text>
                        <Text style={styles.appLineDay}>
                          {['Tue', 'Thu'][index]} · evening
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* The app's own bar, which is most of what makes a
                    drawing of a screen read as a screen. */}
                <View style={styles.tabBar}>
                  {(
                    [
                      ['home', 'Home', true],
                      ['library', 'Library', false],
                      ['calendar', 'Plan', false],
                    ] as const
                  ).map(([icon, label, on]) => (
                    <View key={label} style={styles.tab}>
                      <Ionicons
                        name={icon}
                        size={16}
                        color={on ? COLORS.accent : COLORS.mediumGrey}
                      />
                      <Text style={[styles.tabWord, on && styles.tabWordOn]}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.homeIndicator} />
              </View>

              {/* The island paints over the screen's top edge, the way
                  the real one sits in the display rather than above it. */}
              <View style={styles.island} />
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
  /**
   * These are the section's controls and sat at half the weight of the
   * phone beside them. Bigger box, thicker rule, bigger type — a row
   * somebody is meant to act on should look like it.
   */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg + 4,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.strokeStrong,
    minWidth: 330,
  },
  badgeLive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  badgeSmall: { ...TYPE.caption, fontSize: 14 },
  badgeSmallLive: { color: 'rgba(39,47,63,0.7)' },
  badgeBig: { ...TYPE.h2, fontSize: 21, color: COLORS.white },
  badgeBigLive: { color: COLORS.navy },
  footnote: { ...TYPE.caption, fontSize: 15, marginTop: SPACING.lg },

  /**
   * On the lip. The phone hangs a third of itself past the band's
   * bottom edge into the next section — an object standing across the
   * boundary reads as a thing in the world, where one floating mid-band
   * reads as a figure in a document. The band above carries `raise` so
   * this paints over the closing band rather than under it.
   */
  phoneSlot: { alignItems: 'center', marginBottom: -150, zIndex: 1 },
  /**
   * Wide layouts centre the phone against the copy column, whose height
   * sets the band's — so the negative margin that works in the stacked
   * layout moves nothing here. A transform is paint-space, not layout:
   * it carries the phone across the boundary without the band noticing.
   */
  phoneSlotWide: { marginBottom: 0, transform: [{ translateY: 132 }] },

  stage: { alignItems: 'center', justifyContent: 'center' },
  floater: {
    position: 'absolute',
    width: 116,
    height: 72,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#161C27',
    overflow: 'hidden',
    boxShadow: '0 16px 34px rgba(0,0,0,0.45)',
  },
  floaterArt: { width: '100%', height: '100%' },
  floaterLeft: { left: -46, top: 74, transform: [{ rotate: '-11deg' }] },
  floaterRight: { right: -44, bottom: 96, transform: [{ rotate: '9deg' }] },

  device: {
    width: PHONE_W,
    height: Math.round(PHONE_W * 2.03),
    borderRadius: 46,
    backgroundColor: '#0B0E15',
    padding: BEZEL,
    boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
  },
  side: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
    backgroundColor: '#0B0E15',
  },
  sideVolumeUp: { left: -3, top: 116, height: 34 },
  sideVolumeDown: { left: -3, top: 158, height: 34 },
  sidePower: { right: -3, top: 138, height: 54 },

  screen: {
    flex: 1,
    borderRadius: 38,
    overflow: 'hidden',
    backgroundColor: COLORS.darkGrey,
  },
  island: {
    position: 'absolute',
    alignSelf: 'center',
    top: BEZEL + 9,
    width: 78,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#0B0E15',
  },
  statusBar: {
    height: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTime: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.white,
  },
  statusIcons: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 2.5, borderRadius: 1, backgroundColor: COLORS.white },
  battery: {
    width: 20,
    height: 10,
    marginLeft: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: 1.5,
  },
  batteryFill: {
    flex: 1,
    borderRadius: 1.5,
    backgroundColor: COLORS.white,
  },

  app: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 8,
    overflow: 'hidden',
  },
  appEyebrow: { ...TYPE.tag, fontSize: 10, color: COLORS.accent },
  appHero: {
    width: '100%',
    // Wider than the card elsewhere: the screen is a fixed height, and
    // twenty-seven pixels off the hero is what lets the week's rows
    // finish above the tab bar instead of running under it.
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  appTitle: { ...TYPE.h2, fontSize: 17, color: COLORS.white },
  appMeta: { ...TYPE.caption, fontSize: 11 },
  appRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  appTile: {
    flex: 1,
    aspectRatio: 16 / 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  appSection: {
    ...TYPE.tag,
    fontSize: 9,
    color: COLORS.mediumGrey,
    marginTop: 6,
  },
  appLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLineArt: {
    width: 34,
    height: 23,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  appLineBody: { flex: 1 },
  appLineName: { ...TYPE.h3, fontSize: 11, color: COLORS.white },
  appLineDay: { ...TYPE.caption, fontSize: 9 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
    backgroundColor: 'rgba(39,47,63,0.6)',
    paddingTop: 7,
    paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabWord: { ...TYPE.tag, fontSize: 8, color: COLORS.mediumGrey },
  tabWordOn: { color: COLORS.accent },
  homeIndicator: {
    alignSelf: 'center',
    width: 108,
    height: 4,
    borderRadius: 2,
    marginBottom: 9,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
