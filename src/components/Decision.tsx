import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Commitment } from './Commitment';
import { FinishCelebration } from './FinishCelebration';
import { SessionTimer } from './SessionTimer';
import { CONFIRM, StatusActions } from './StatusActions';
import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { tap } from '@/lib/haptics';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * What are you doing about this game — asked the way a store page asks.
 *
 * For a game that is not yours yet there is one thing to do, so there
 * is one button: the amber primary, the app's one loud control, and
 * under it the two quieter truths a reader might already know. A
 * three-way segmented control with nothing selected was a form waiting
 * to be filled in, on a page most people open to decide whether to
 * bother; the answer was hidden among three equal options.
 *
 * Once the game is on the shelf the decision becomes a state, and a
 * state is what the segmented control is for: the amber segment says
 * where it stands, the session clock and the commitments follow.
 */
export function Decision({ game }: { game: Game }) {
  const { statusOf, setStatus } = useLibrary();
  const toast = useToast();
  const [celebrating, setCelebrating] = useState(false);
  const status = statusOf(game.id);

  if (status) {
    return (
      <View style={styles.saved}>
        <StatusActions game={game} />
        <View style={styles.follow}>
          <SessionTimer game={game} />
          <Commitment gameId={game.id} />
        </View>
      </View>
    );
  }

  const mark = (next: LibraryStatus) => {
    tap();
    setStatus(game, next);
    // Finishing gets a moment; everything else gets a toast.
    if (next === 'finished') {
      setCelebrating(true);
      return;
    }
    toast(CONFIRM[next], STATUS_META[next].icon as never);
  };

  return (
    <View style={styles.fresh}>
      <Pressable
        onPress={() => mark('wishlist')}
        accessibilityRole="button"
        accessibilityLabel={`Add ${game.name} to your backlog`}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Ionicons name="bookmark" size={16} color={COLORS.navy} />
        <Text style={styles.primaryText}>Want to play</Text>
      </Pressable>
      <View style={styles.also}>
        <Pressable
          onPress={() => mark('playing')}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${game.name} as playing`}
          style={styles.quiet}
          hitSlop={6}
        >
          <Ionicons
            name="game-controller-outline"
            size={14}
            color={COLORS.lightGrey}
          />
          <Text style={styles.quietText}>Playing it now</Text>
        </Pressable>
        <Pressable
          onPress={() => mark('finished')}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${game.name} as finished`}
          style={styles.quiet}
          hitSlop={6}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={COLORS.lightGrey}
          />
          <Text style={styles.quietText}>Already finished</Text>
        </Pressable>
      </View>
      <FinishCelebration
        game={celebrating ? game : null}
        onClose={() => setCelebrating(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fresh: { gap: SPACING.sm + 2 },
  saved: { gap: SPACING.sm + 2 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
  },
  pressed: { opacity: 0.88 },
  primaryText: { ...TYPE.label, color: COLORS.navy },
  also: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  quiet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  quietText: { ...TYPE.labelSmall, color: COLORS.lightGrey },
  follow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
});
