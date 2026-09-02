import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FinishCelebration } from './FinishCelebration';
import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { tap } from '@/lib/haptics';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const ORDER: LibraryStatus[] = ['wishlist', 'playing', 'finished'];

/**
 * Want to play / Playing / Finished — the backlog, one tap deep.
 *
 * One control, not three buttons. A game is in exactly one of these
 * states, and drawing them as three separate outlined pills said the
 * opposite: three independent things you might switch on. It also put
 * three more lozenges on a page that already had a session button, two
 * commitment toggles and a row of store links in the same shape — by
 * the fourth row of rounded outlines the eye stops distinguishing them,
 * and a page of identical outlines is the cheapest a dark interface can
 * look.
 *
 * Grouped, with the chosen state filled in the accent, it matches the
 * Plan's dials: one selection language for the whole app.
 */
const CONFIRM: Record<LibraryStatus, string> = {
  wishlist: 'Saved — Want to play',
  playing: 'Marked as Playing',
  finished: 'Finished — credits rolled',
};

export function StatusActions({ game }: { game: Game }) {
  const { statusOf, setStatus } = useLibrary();
  const toast = useToast();
  const current = statusOf(game.id);
  const [celebrating, setCelebrating] = useState(false);

  return (
    <View style={styles.group}>
      {ORDER.map((status) => {
        const active = current === status;
        const meta = STATUS_META[status];
        return (
          <Pressable
            key={status}
            onPress={() => {
              // Felt as well as seen: a segmented control that clicks
              // under the thumb is the platform's own behaviour.
              tap();
              setStatus(game, active ? null : status);
              // Finishing gets a moment; everything else gets a toast.
              if (!active && status === 'finished') {
                setCelebrating(true);
                return;
              }
              toast(
                active ? 'Removed from library' : CONFIRM[status],
                active ? 'close-circle' : (meta.icon as never)
              );
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              active ? `Remove from ${meta.label}` : `Mark as ${meta.label}`
            }
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && !active && styles.segmentPressed,
            ]}
          >
            <Ionicons
              name={
                (active
                  ? meta.icon
                  : meta.iconOutline) as keyof typeof Ionicons.glyphMap
              }
              size={15}
              color={active ? COLORS.navy : COLORS.lightGrey}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
      <FinishCelebration
        game={celebrating ? game : null}
        onClose={() => setCelebrating(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    backgroundColor: COLORS.plate,
    // A point more air inside the frame; at 3 the segments touched
    // their own plate and the group read as compressed even when the
    // segments themselves had room.
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm - 4,
  },
  segmentActive: { backgroundColor: COLORS.accent },
  segmentPressed: { backgroundColor: COLORS.raised },
  label: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  labelActive: { color: COLORS.navy },
});
