import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from './Chip';
import type { BrowseFilters } from '@/api/rawg';
import { SPACING } from '@/styles/theme';

const SORTS = [
  { label: 'Popular', ordering: undefined },
  { label: 'Newest', ordering: '-released' },
  { label: 'Top rated', ordering: '-metacritic' },
] as const;

const PLATFORMS = [
  { label: 'PC', id: 1 },
  { label: 'PlayStation', id: 2 },
  { label: 'Xbox', id: 3 },
  { label: 'Switch', id: 7 },
] as const;

export interface BrowseRefinements {
  ordering?: string;
  platformIds: number[];
  minMetacritic: boolean;
}

export const DEFAULT_REFINEMENTS: BrowseRefinements = {
  ordering: undefined,
  platformIds: [],
  minMetacritic: false,
};

export function toBrowseFilters(r: BrowseRefinements): BrowseFilters {
  return {
    ordering: r.ordering,
    parentPlatforms: r.platformIds.length
      ? [...r.platformIds].sort((a, b) => a - b).join(',')
      : undefined,
    minMetacritic: r.minMetacritic,
  };
}

interface Props {
  value: BrowseRefinements;
  onChange: (next: BrowseRefinements) => void;
  /** Curated feeds (must-play) can't be re-sorted or filtered. */
  disabled?: boolean;
}

/**
 * One calm row of refinements: sort on the left, platform + quality
 * filters after a gap. Chips are the app's selection language (white pill,
 * dark ink), and the row scrolls sideways on narrow screens instead of
 * wrapping into a wall.
 */
export function FilterBar({ value, onChange, disabled = false }: Props) {
  if (disabled) return null;

  const togglePlatform = (id: number) => {
    const has = value.platformIds.includes(id);
    onChange({
      ...value,
      platformIds: has
        ? value.platformIds.filter((p) => p !== id)
        : [...value.platformIds, id],
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {SORTS.map((sort) => (
        <Chip
          key={sort.label}
          title={sort.label}
          selected={value.ordering === sort.ordering}
          onPress={() => onChange({ ...value, ordering: sort.ordering })}
        />
      ))}
      <View style={styles.gap} />
      {PLATFORMS.map((platform) => (
        <Chip
          key={platform.id}
          title={platform.label}
          selected={value.platformIds.includes(platform.id)}
          onPress={() => togglePlatform(platform.id)}
        />
      ))}
      <Chip
        title="80+ rated"
        selected={value.minMetacritic}
        onPress={() =>
          onChange({ ...value, minMetacritic: !value.minMetacritic })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  gap: { width: SPACING.md },
});
