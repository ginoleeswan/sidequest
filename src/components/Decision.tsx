import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Commitment } from './Commitment';
import { FinishCelebration } from './FinishCelebration';
import { PrimaryButton } from './PrimaryButton';
import { SessionTimer } from './SessionTimer';
import { CONFIRM, StatusActions } from './StatusActions';
import { useToast } from './Toast';
import { Touchable } from './Touchable';
import type { Game } from '@/api/types';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { ICON, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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

  const mark = (next: LibraryStatus) => {
    setStatus(game, next);
    // Finishing gets a moment; everything else gets a toast.
    if (next === 'finished') {
      setCelebrating(true);
      return;
    }
    toast(CONFIRM[next], STATUS_META[next].icon as never);
  };

  return (
    <>
      {status ? (
        <View style={styles.saved}>
          <StatusActions game={game} />
          <View style={styles.follow}>
            <SessionTimer game={game} />
            <Commitment gameId={game.id} />
          </View>
        </View>
      ) : (
        <View style={styles.fresh}>
          {/* Named by what it says. Its label was "Add Celeste to your
              backlog" under the words "Want to play", so a reader using
              Voice Control said the words on the button and nothing
              happened. The longer sentence is the hint now. */}
          <PrimaryButton
            label="Want to play"
            onPress={() => mark('wishlist')}
            accessibilityHint={`Adds ${game.name} to your backlog`}
            block
          />
          <View style={styles.also}>
            <Touchable
              onPress={() => mark('playing')}
              haptic="tap"
              hitSlop="text"
              accessibilityLabel="Playing it now"
              accessibilityHint={`Marks ${game.name} as playing`}
              style={styles.quiet}
            >
              <Ionicons
                name="game-controller-outline"
                size={ICON.sm}
                color={COLORS.lightGrey}
              />
              <Text
                style={styles.quietText}
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                Playing it now
              </Text>
            </Touchable>
            <Touchable
              onPress={() => mark('finished')}
              hitSlop="text"
              accessibilityLabel="Already finished"
              accessibilityHint={`Marks ${game.name} as finished`}
              style={styles.quiet}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={ICON.sm}
                color={COLORS.lightGrey}
              />
              <Text
                style={styles.quietText}
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                Already finished
              </Text>
            </Touchable>
          </View>
        </View>
      )}
      {/* Outside both branches. Marking a fresh game finished turns it
          into a saved one on the same render, and a celebration mounted
          inside the fresh branch unmounted with it before it could open. */}
      <FinishCelebration
        game={celebrating ? game : null}
        onClose={() => setCelebrating(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fresh: { gap: SPACING.sm2 },
  saved: { gap: SPACING.sm2 },
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
