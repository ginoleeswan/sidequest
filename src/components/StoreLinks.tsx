import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { StoreLink as StoreLinkT, StoreRef } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

interface Props {
  stores?: StoreRef[];
  links?: StoreLinkT[];
  website?: string;
}

function LinkPill({ label, url }: { label: string; url: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.pill, hovered && styles.pillHovered]}
    >
      <Text style={[styles.label, hovered && styles.labelHovered]}>
        {label}
      </Text>
      <Ionicons
        name="open-outline"
        size={13}
        color={hovered ? COLORS.white : COLORS.mediumGrey}
      />
    </Pressable>
  );
}

/** Where to get it: storefronts plus the official site. */
export function StoreLinks({ stores, links, website }: Props) {
  const byId = new Map((links ?? []).map((l) => [l.store_id, l.url]));
  const items = (stores ?? [])
    .map((s) => ({ name: s.store.name, url: byId.get(s.store.id) }))
    .filter((s): s is { name: string; url: string } => Boolean(s.url));

  if (items.length === 0 && !website) return null;

  return (
    <View style={styles.row}>
      {website ? <LinkPill label="Official site" url={website} /> : null}
      {items.map((item) => (
        <LinkPill key={item.url} label={item.name} url={item.url} />
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
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.lightGrey,
  },
  labelHovered: { color: COLORS.white },
});
