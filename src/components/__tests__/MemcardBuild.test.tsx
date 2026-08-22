import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { MemcardBuild } from '../MemcardBuild';
import type { Memcard } from '@/lib/memcard';

const card: Memcard = {
  year: 2025,
  count: 2,
  hours: 20,
  blocks: [
    { id: 1, name: 'A game', hours: 12, month: 0 },
    { id: 2, name: 'Another game', hours: 8, month: 4 },
  ],
  longest: { id: 1, name: 'A game', hours: 12, month: 0 },
  headline: 'Two games.',
  subhead: 'A year.',
};

const games = [
  { id: 1, name: 'A game', background_image: 'https://media.rawg.io/a.jpg' },
  { id: 2, name: 'Another game', background_image: 'https://media.rawg.io/b.jpg' },
] as never;

describe('MemcardBuild', () => {
  it('renders the card whether or not it is being scrubbed', async () => {
    await render(<MemcardBuild card={card} games={games} />);
    // `card.headline` only ever reaches the tree as the landing card's
    // accessibilityLabel (see LandingMemcard.tsx) — it is never a visible
    // Text node — so this asserts on the label rather than getByText.
    expect(screen.getByLabelText('2025: Two games.')).toBeTruthy();
  });

  // The whole point of the change: a caller can hand it a position
  // rather than letting it run on a clock of its own.
  it('accepts an external driver without falling over', async () => {
    const progress = new Animated.Value(0);
    await render(
      <MemcardBuild card={card} games={games} progress={progress} />
    );
    expect(screen.getByLabelText('2025: Two games.')).toBeTruthy();
    progress.setValue(1);
    expect(screen.getByLabelText('2025: Two games.')).toBeTruthy();
  });
});
