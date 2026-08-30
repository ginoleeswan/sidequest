import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { StoreLink as StoreLinkT, StoreRef } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  stores?: StoreRef[];
  links?: StoreLinkT[];
  website?: string;
}

/**
 * Only the web's own schemes get opened.
 *
 * Every URL rendered here comes from RAWG's community-editable data, so
 * it is third-party input wearing a button. On react-native-web
 * `openURL` is `window.open`, and a `javascript:` URL there runs in the
 * app's origin — which holds the session. On native an arbitrary custom
 * scheme is a free trampoline into any installed app. A store link is
 * https or it is nothing.
 */
const openSafely = (url: string) => {
  if (/^https?:\/\//i.test(url)) Linking.openURL(url);
};

export function LinkPill({
  label,
  url,
  icon = 'open-outline',
}: {
  label: string;
  url: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={() => openSafely(url)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.pill, hovered && styles.pillHovered]}
    >
      {/* The mark leads and the arrow is gone. Every pill in this block
          opens somewhere else, so six little open-arrows said the same
          thing six times; a storefront's own mark identifies the
          destination faster than its name does, which is the whole job
          of an icon on a button. */}
      <Ionicons
        name={icon}
        size={14}
        color={hovered ? COLORS.white : COLORS.lightGrey}
      />
      <Text style={[styles.label, hovered && styles.labelHovered]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * RAWG's store ids, which are stable and documented, to the brand marks
 * Ionicons actually has. Epic, GOG, Nintendo and itch have no glyph in
 * the set, and a wrong mark is worse than a plain one — they share a
 * single neutral storefront icon instead, so the row still reads as
 * "places to buy" at a glance with no pill pretending to a brand.
 */
const STORE_ICONS: Record<
  number,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  1: 'logo-steam',
  2: 'logo-xbox',
  3: 'logo-playstation',
  4: 'logo-apple-appstore',
  7: 'logo-xbox',
  8: 'logo-google-playstore',
};

/** Where to get it: storefronts plus the official site. */
export function StoreLinks({ stores, links, website }: Props) {
  const byId = new Map((links ?? []).map((l) => [l.store_id, l.url]));
  const items = (stores ?? [])
    .map((s) => ({
      name: s.store.name,
      url: byId.get(s.store.id),
      icon: STORE_ICONS[s.store.id] ?? ('storefront-outline' as const),
    }))
    .filter((s): s is { name: string; url: string; icon: never } =>
      Boolean(s.url)
    );

  if (items.length === 0 && !website) return null;

  return (
    <View style={styles.row}>
      {website ? (
        <LinkPill label="Official site" url={website} icon="globe-outline" />
      ) : null}
      {items.map((item) => (
        <LinkPill
          key={item.url}
          label={item.name}
          url={item.url}
          icon={item.icon}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pillHovered: { backgroundColor: 'rgba(255,255,255,0.08)' },
  label: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
  },
  labelHovered: { color: COLORS.white },
});
