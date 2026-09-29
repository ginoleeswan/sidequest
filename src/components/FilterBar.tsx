import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { Touchable } from './Touchable';
import type { BrowseFilters } from '@/api/rawg';
import { COLORS, alpha } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/**
 * Every control in the bar is drawn at 36 and made up to 44 with slop:
 * the row scrolls sideways, so the slop grows up and down only.
 */
const SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

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
    <Touchable
      onPress={onPress}
      haptic={selected ? undefined : 'tap'}
      hitSlop={SLOP}
      accessibilityState={{ selected }}
      style={[styles.segment, selected && styles.segmentOn]}
    >
      <Ionicons
        name={icon}
        size={ICON.sm}
        color={selected ? COLORS.darkGrey : COLORS.mediumGrey}
      />
      <Text
        style={[styles.segmentText, selected && styles.segmentTextOn]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {label}
      </Text>
    </Touchable>
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
  const tint = selected ? COLORS.white : COLORS.lightGrey;
  return (
    <Touchable
      onPress={onPress}
      haptic="tap"
      hitSlop={SLOP}
      accessibilityState={{ selected }}
      style={[styles.toggle, selected && styles.toggleOn]}
    >
      {ionicon ? (
        <Ionicons name={ionicon} size={ICON.sm} color={tint} />
      ) : icon && iconType ? (
        <DynamicIcon type={iconType} name={icon} size={ICON.sm} color={tint} />
      ) : null}
      <Text
        style={[styles.toggleText, selected && styles.toggleTextOn]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {label}
      </Text>
    </Touchable>
  );
}

interface Props {
  value: BrowseRefinements;
  onChange: (next: BrowseRefinements) => void;
  /** Curated feeds (must-play) can't be re-sorted or filtered. */
  disabled?: boolean;
  /**
   * The parent's horizontal padding.
   *
   * A horizontal scroller inside a padded column clips at the padding:
   * the last chip stopped dead at the gutter with the page's own margin
   * showing past it, which is the one tell that a row was placed in a
   * box rather than laid across the screen. Like `Rail`, the bar bleeds
   * out by the inset and pays it back as content padding, so the first
   * chip still lines up with the heading above and the row runs to the
   * true edge.
   */
  inset?: number;
}

/**
 * Refinements as two distinct instruments: a segmented dial for sort
 * (pick exactly one) and stackable toggles for filters (pick any). The
 * shapes teach the behaviour before you tap anything, and a Clear appears
 * only once something is actually on.
 */
export function FilterBar({
  value,
  onChange,
  disabled = false,
  inset = 0,
}: Props) {
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
      testID="filter-bar"
      style={[styles.scroller, inset > 0 && { marginHorizontal: -inset }]}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
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
        <Touchable
          onPress={() => onChange(DEFAULT_REFINEMENTS)}
          haptic="tap"
          hitSlop={SLOP}
          accessibilityLabel={`Clear ${active} filters`}
          style={styles.clear}
        >
          <Ionicons name="close" size={ICON.sm} color={COLORS.accent} />
          <Text
            style={styles.clearText}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            Clear {active}
          </Text>
        </Touchable>
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
    borderRadius: RADIUS.pill,
    backgroundColor: alpha(COLORS.ink, 0.22),
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md - 2,
    minHeight: 30,
    borderRadius: RADIUS.pill,
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
  /**
   * A switch you can stack: the same lifted fill and the same ring as a
   * picked Chip, because they are the same kind of choice. White was
   * the single-choice dial's look, and two looks for one idea is how a
   * reader stops trusting either.
   */
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    minHeight: 36,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  toggleOn: { backgroundColor: alpha(COLORS.white, 0.12) },
  toggleText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  toggleTextOn: { color: COLORS.white },

  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md - 2,
    minHeight: 36,
  },
  clearText: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
});
