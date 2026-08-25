import { screen } from '@testing-library/react-native';

import { Shelf } from '../Shelf';
import { renderApp, useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';

// Per test, not per suite: a write in one test must not be visible to
// the next, or the suite is order-dependent by construction.
beforeEach(() => useFakeStorage());

const games = (n: number): Game[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Game ${i + 1}`,
    released: '2024-03-05',
  })) as Game[];

const section = (over: Partial<Section> = {}): Section =>
  ({
    key: 'trending',
    title: 'Trending now',
    iconName: 'trending-up',
    iconType: 'ionicon',
    fetch: jest.fn(),
    ...over,
  }) as Section;

describe('Shelf', () => {
  it('renders nothing rather than an empty row', async () => {
    await renderApp(<Shelf section={section()} games={[]} />);
    // Not even the heading: an empty shelf is a gap, not a section.
    expect(screen.queryByText('Trending now')).toBeNull();
  });

  it('shows the section title', async () => {
    await renderApp(<Shelf section={section()} games={games(3)} />);
    expect(screen.getByText('Trending now')).toBeTruthy();
  });

  /**
   * A top-ten row is ten, however many games arrive.
   *
   * Only the first window is asserted: Rail is a FlatList, so it mounts
   * about ten items regardless and the rest arrive on scroll. What can
   * be checked here is that the ranked shelf is *given* ten — the eleventh
   * is absent because it was sliced away, not merely not yet rendered.
   */
  it('caps a ranked shelf at ten', async () => {
    await renderApp(
      <Shelf section={section({ variant: 'ranked' })} games={games(25)} />
    );
    expect(screen.queryByText('Game 10')).toBeTruthy();
    expect(screen.queryByText('Game 11')).toBeNull();
  });

  it('labels a ranked shelf as a top ten', async () => {
    await renderApp(
      <Shelf section={section({ variant: 'ranked' })} games={games(12)} />
    );
    expect(screen.getByText('Top 10')).toBeTruthy();
  });

  it('prefers an explicit eyebrow over the ranked default', async () => {
    await renderApp(
      <Shelf
        section={section({ variant: 'ranked', eyebrow: 'Editor picks' })}
        games={games(12)}
      />
    );
    expect(screen.getByText('Editor picks')).toBeTruthy();
    expect(screen.queryByText('Top 10')).toBeNull();
  });

  it('renders each variant without crashing on its own tile shape', async () => {
    for (const variant of ['default', 'dated', 'large', 'ranked'] as const) {
      await renderApp(
        <Shelf section={section({ variant })} games={games(3)} />
      );
      expect(screen.getAllByText('Game 1').length).toBeGreaterThan(0);
    }
  });

  /** Dated shelves badge each tile with a short release date. */
  it('badges a dated shelf with release dates', async () => {
    await renderApp(
      <Shelf section={section({ variant: 'dated' })} games={games(2)} />
    );
    expect(screen.getAllByText('MAR 5').length).toBeGreaterThan(0);
  });

  it('offers "view all" only where there is a page to open', async () => {
    await renderApp(<Shelf section={section()} games={games(3)} />);
    expect(screen.queryByText('View all →')).toBeNull();

    await renderApp(
      <Shelf section={section()} games={games(3)} onViewAll={jest.fn()} />
    );
    expect(screen.getByText('View all →')).toBeTruthy();
  });
});
