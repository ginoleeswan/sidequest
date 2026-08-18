import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

const ORDER: LibraryStatus[] = ['wishlist', 'playing', 'finished'];

/** Want to play / Playing / Finished — the backlog, one tap deep. */
const CONFIRM: Record<LibraryStatus, string> = {
  wishlist: 'Saved — Want to play',
  playing: 'Marked as Playing',
  finished: 'Finished — credits rolled',
};

export function StatusActions({ game }: { game: Game }) {
  const { statusOf, setStatus } = useLibrary();
  const toast = useToast();
  const current = statusOf(game.id);

  return (
    <View style={styles.row}>
      {ORDER.map((status) => {
        const active = current === status;
        const meta = STATUS_META[status];
        return (
          <Pressable
            key={status}
            onPress={() => {
              setStatus(game, active ? null : status);
              toast(
                active ? 'Removed from library' : CONFIRM[status],
                active ? 'close-circle' : (meta.icon as never)
              );
            }}
            style={[styles.button, active && styles.buttonActive]}
          >
            <Ionicons
              name={
                (active
                  ? meta.icon
                  : `${meta.icon}-outline`) as keyof typeof Ionicons.glyphMap
              }
              size={15}
              color={active ? COLORS.darkGrey : COLORS.lightGrey}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  buttonActive: {
    backgroundColor: COLORS.white,
    borderColor: 'transparent',
  },
  label: {
    fontFamily: 'Noah-Bold',
    fontSize: 12.5,
    color: COLORS.lightGrey,
  },
  labelActive: { color: COLORS.darkGrey },
});
