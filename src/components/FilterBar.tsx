import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import type { BrowseFilters } from '@/api/rawg';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const SORTS: {
  label: string;
  ordering?: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Popular', ordering: undefined, icon: 'flame' },
  { label: 'Newest', ordering: '-released', icon: 'sparkles' },
  { label: 'Top rated', ordering: '-metacritic', icon: 'trophy' },
];

const PLATFORMS: { label: string; id: number; icon: string; type: IconType }[] =
  [
    {
      label: 'PC',
      id: 1,
      icon: 'microsoft-windows',
      type: 'glyph',
    },
    { label: 'PlayStation', id: 2, icon: 'logo-playstation', type: 'ionicon' },
    {
      label: 'Xbox',
      id: 3,
      icon: 'microsoft-xbox',
      type: 'glyph',
    },
    {
      label: 'Switch',
      id: 7,
      icon: 'nintendo-switch',
      type: 'glyph',
    },
  ];

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

/** How many refinements are away from their default. */
function activeCount(r: BrowseRefinements) {
  return (
    (r.ordering ? 1 : 0) + r.platformIds.length + (r.minMetacritic ? 1 : 0)
  );
}

/** One segment of the sort control — single-select, so it reads as a dial. */
function Segment({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.segment, selected && styles.segmentOn]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={selected ? COLORS.darkGrey : COLORS.mediumGrey}
      />
      <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A toggle — multi-select, so it reads as a switch you can stack. */
function Toggle({
  label,
  icon,
  iconType,
  ionicon,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  iconType?: IconType;
  ionicon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = selected ? COLORS.darkGrey : COLORS.lightGrey;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.toggle, selected && styles.toggleOn]}
    >
      {ionicon ? (
        <Ionicons name={ionicon} size={14} color={tint} />
      ) : icon && iconType ? (
        <DynamicIcon type={iconType} name={icon} size={15} color={tint} />
      ) : null}
      <Text style={[styles.toggleText, selected && styles.toggleTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface Props {
  value: BrowseRefinements;
  onChange: (next: BrowseRefinements) => void;
  /** Curated feeds (must-play) can't be re-sorted or filtered. */
  disabled?: boolean;
}

/**
 * Refinements as two distinct instruments: a segmented dial for sort
 * (pick exactly one) and stackable toggles for filters (pick any). The
 * shapes teach the behaviour before you tap anything, and a Clear appears
 * only once something is actually on.
 */
export function FilterBar({ value, onChange, disabled = false }: Props) {
  if (disabled) return null;

  const active = activeCount(value);

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
      <View style={styles.segmented}>
        {SORTS.map((sort) => (
          <Segment
            key={sort.label}
            label={sort.label}
            icon={sort.icon}
            selected={value.ordering === sort.ordering}
            onPress={() => onChange({ ...value, ordering: sort.ordering })}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {PLATFORMS.map((platform) => (
        <Toggle
          key={platform.id}
          label={platform.label}
          icon={platform.icon}
          iconType={platform.type}
          selected={value.platformIds.includes(platform.id)}
          onPress={() => togglePlatform(platform.id)}
        />
      ))}
      <Toggle
        label="80+ rated"
        ionicon="ribbon"
        selected={value.minMetacritic}
        onPress={() =>
          onChange({ ...value, minMetacritic: !value.minMetacritic })
        }
      />

      {active > 0 && (
        <Pressable
          onPress={() => onChange(DEFAULT_REFINEMENTS)}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${active} filters`}
          style={styles.clear}
        >
          <Ionicons name="close" size={14} color={COLORS.accent} />
          <Text style={styles.clearText}>Clear {active}</Text>
        </Pressable>
      )}
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

  // sort: one recessed track, the choice lifted out of it
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm - 1,
    borderRadius: RADIUS.lg,
  },
  segmentOn: { backgroundColor: COLORS.white },
  segmentText: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
  segmentTextOn: { color: COLORS.darkGrey },

  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.stroke,
    marginHorizontal: SPACING.xs,
  },

  // filters: independent switches
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  toggleOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  toggleText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  toggleTextOn: { color: COLORS.darkGrey },

  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
  },
  clearText: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
});
