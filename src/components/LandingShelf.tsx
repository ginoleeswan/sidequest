import { StyleSheet, View } from 'react-native';

import { GameTile } from './GameTile';
import { Rise } from './Rise';
import type { Game } from '@/api/types';
import { SPACING } from '@/styles/theme';

/**
 * A row of the app's own tiles, running off the edge of the page.
 *
 * The landing page's other demonstrations are single objects, which
 * proves the tile exists but not what it is for — and what it is for is
 * volume. A shelf that plainly continues past the right edge says
 * "forty of these" without the sentence, and it is the same component,
 * fed the same data, that the app draws on every other screen.
 *
 * Each tile arrives on its own clock. A row that lands as one block
 * reads as an image of a row; one that lands left to right reads as a
 * shelf filling up, which is the thing being described.
 */
export function LandingShelf({
  games,
  width = 168,
}: {
  games: Game[];
  width?: number;
}) {
  if (games.length === 0) return null;

  return (
    <View style={styles.shelf}>
      {games.map((game, index) => (
        <Rise key={game.id} from="lift" delay={index * 80}>
          <GameTile game={game} width={width} />
        </Rise>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    flexDirection: 'row',
    gap: SPACING.md,
    // Clipped, not wrapped. The point of the row is that it does not
    // end where the screen does.
    overflow: 'hidden',
  },
});
