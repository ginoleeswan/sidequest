import { act, render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { MemcardBuild } from '../MemcardBuild';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Memcard } from '@/lib/memcard';

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

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

/**
 * `LandingMemcard` sums only the LANDED blocks' hours (see
 * `LandingMemcard.tsx:152-154`), not the card's total, so "20" — the sum
 * of both fixture blocks' hours (12 + 8) — appears in the tree if and
 * only if both blocks have landed. It never collides with the year
 * ("2025"), the games-landed count ("0" or "2"), or any per-slot hours
 * chip (12h / 8h are rendered as "12h" / "8h", not "12" / "8"), so it is
 * safe to use as a stand-in for "the build finished."
 */
describe('MemcardBuild', () => {
  afterEach(() => jest.mocked(useReducedMotion).mockReturnValue(false));

  it('renders the card whether or not it is being scrubbed', async () => {
    await render(<MemcardBuild card={card} games={games} />);
    // `card.headline` only ever reaches the tree as the landing card's
    // accessibilityLabel (see LandingMemcard.tsx) — it is never a visible
    // Text node — so this asserts on the label rather than getByText.
    expect(screen.getByLabelText('2025: Two games.')).toBeTruthy();
  });

  // The whole point of the change: a caller can hand it a position
  // rather than letting it run on a clock of its own — and moving that
  // position has to actually move `landed`, both forward and back. The
  // interrupted first attempt at this task passed a test that only
  // checked a label rendered; that would still pass with
  // `driver.addListener` deleted outright, which is exactly what had
  // silently broken. This asserts on the one number in the tree that is
  // provably a function of how many blocks have landed.
  it('advances and reverses as the driver moves', async () => {
    const progress = new Animated.Value(0);
    await render(
      <MemcardBuild card={card} games={games} progress={progress} />
    );
    expect(screen.queryByText('20')).toBeNull();

    await act(async () => progress.setValue(1));
    expect(screen.getByText('20')).toBeTruthy();

    await act(async () => progress.setValue(0));
    expect(screen.queryByText('20')).toBeNull();
  });

  // The driver can already be part-way through when this component
  // mounts — a reader who reloaded mid-section, or this subtree mounting
  // late behind a deferred-render wrapper on web. `Animated.Value.addListener`
  // only fires on the NEXT change, so without seeding from the driver's
  // current value at subscribe time, `landed` would stay stuck at 0
  // forever even though every animated output (the settle, each flier's
  // flight) already paints the finished state.
  it('starts already caught up to a driver that is not at zero', async () => {
    const progress = new Animated.Value(1);
    await render(
      <MemcardBuild card={card} games={games} progress={progress} />
    );
    expect(screen.getByText('20')).toBeTruthy();
  });

  // Reduced motion has to short-circuit to the finished state
  // immediately, regardless of what the driver is doing (or whether
  // there is one at all) — this path had no coverage before.
  it('shows the finished state immediately under reduced motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const progress = new Animated.Value(0);
    await render(
      <MemcardBuild card={card} games={games} progress={progress} />
    );
    expect(screen.getByText('20')).toBeTruthy();
  });
});
