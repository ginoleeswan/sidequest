import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import {
  DEFAULT_REFINEMENTS,
  FilterBar,
  toBrowseFilters,
  type BrowseRefinements,
} from '../FilterBar';

describe('toBrowseFilters', () => {
  it('sends nothing when nothing is refined', () => {
    expect(toBrowseFilters(DEFAULT_REFINEMENTS)).toEqual({
      ordering: undefined,
      parentPlatforms: undefined,
      minMetacritic: false,
    });
  });

  it('joins platforms in a stable order so the cache key is stable', () => {
    const a = toBrowseFilters({
      ...DEFAULT_REFINEMENTS,
      platformIds: [7, 1, 3],
    });
    const b = toBrowseFilters({
      ...DEFAULT_REFINEMENTS,
      platformIds: [3, 7, 1],
    });
    expect(a.parentPlatforms).toBe('1,3,7');
    expect(b.parentPlatforms).toBe(a.parentPlatforms);
  });

  it('passes ordering and the quality floor through', () => {
    expect(
      toBrowseFilters({
        ordering: '-metacritic',
        platformIds: [],
        minMetacritic: true,
      })
    ).toEqual({
      ordering: '-metacritic',
      parentPlatforms: undefined,
      minMetacritic: true,
    });
  });
});

/** Drives the bar the way the page does, so state transitions are real. */
function Harness({ onChange }: { onChange?: (r: BrowseRefinements) => void }) {
  const [value, setValue] = useState<BrowseRefinements>(DEFAULT_REFINEMENTS);
  return (
    <FilterBar
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('FilterBar', () => {
  it('renders sorts and filters', async () => {
    await render(<Harness />);
    expect(screen.getByText('Popular')).toBeTruthy();
    expect(screen.getByText('Top rated')).toBeTruthy();
    expect(screen.getByText('PlayStation')).toBeTruthy();
    expect(screen.getByText('80+ rated')).toBeTruthy();
  });

  it('sorting is single-select: choosing one replaces the other', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByText('Newest'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ordering: '-released' })
    );
    await fireEvent.press(screen.getByText('Top rated'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ordering: '-metacritic' })
    );
  });

  it('platforms stack, and tapping again removes just that one', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByText('PC'));
    await fireEvent.press(screen.getByText('Xbox'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ platformIds: [1, 3] })
    );
    await fireEvent.press(screen.getByText('PC'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ platformIds: [3] })
    );
  });

  it('offers Clear only once something is on, and counts it', async () => {
    await render(<Harness />);
    expect(screen.queryByText(/^Clear/)).toBeNull();

    await fireEvent.press(screen.getByText('PC'));
    expect(screen.getByText('Clear 1')).toBeTruthy();

    await fireEvent.press(screen.getByText('80+ rated'));
    expect(screen.getByText('Clear 2')).toBeTruthy();
  });

  it('Clear returns every refinement to its default', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByText('Newest'));
    await fireEvent.press(screen.getByText('Switch'));
    await fireEvent.press(screen.getByText('Clear 2'));
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_REFINEMENTS);
    expect(screen.queryByText(/^Clear/)).toBeNull();
  });

  /**
   * The bar sits in a padded column and must run past the padding: the
   * scroller bleeds out by the inset and the content pays it back, so
   * the first chip lines up and the last is never cut at the gutter.
   */
  it('bleeds across the inset it is given', async () => {
    await render(
      <FilterBar value={DEFAULT_REFINEMENTS} onChange={jest.fn()} inset={20} />
    );
    expect(screen.getByTestId('filter-bar')).toHaveStyle({
      marginHorizontal: -20,
    });
  });

  it('renders nothing for a curated feed that cannot be refined', async () => {
    await render(
      <FilterBar value={DEFAULT_REFINEMENTS} onChange={jest.fn()} disabled />
    );
    expect(screen.queryByText('Popular')).toBeNull();
  });
});
