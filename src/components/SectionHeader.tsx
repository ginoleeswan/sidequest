import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  title: string;
  /** Small muted line above the title, e.g. a count. */
  eyebrow?: string;
  /**
   * A step up, for a page wide enough to need one.
   *
   * The scale on a desktop game page ran 76 for the figure and 44 for
   * the name, then dropped straight to this at 19 — a gap of 25 points
   * with nothing in it, so every section below the masthead read as
   * the same weight as its own caption. Opt-in rather than a
   * breakpoint inside this component: a section heading in a 360pt
   * rail wants the small size whatever the window is doing.
   */
  wide?: boolean;
  actionLabel?: string;
  /**
   * What a screen reader should say instead of the visible label.
   *
   * These labels carry a trailing arrow — "Share →", "Plan my backlog →"
   * — which VoiceOver reads out as the glyph. Where the visible text is
   * also shorthand, the spoken version can say the whole thing.
   */
  actionAccessibilityLabel?: string;
  onAction?: () => void;
  /**
   * The way to You, on a screen that has a section header.
   *
   * It rides the eyebrow's line rather than floating over the top-right
   * corner, and that is not cosmetic: these screens just gave up the
   * clearance they were holding for a back button they no longer have,
   * and a floating icon would want all of it back. Sharing a row the
   * page already draws costs no height at all.
   */
  onAccount?: () => void;
}

/** The one way section titles are rendered, everywhere. */
export function SectionHeader({
  title,
  eyebrow,
  wide = false,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
  onAccount,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.header}>
      {eyebrow || onAccount ? (
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>{eyebrow ?? ''}</Text>
          {onAccount ? (
            <Pressable
              onPress={onAccount}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="You"
            >
              <Ionicons
                name="person-circle-outline"
                size={23}
                color={COLORS.mediumGrey}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {/* The action shares a row with the TITLE, not with the title and
          its eyebrow together. Set against the pair it was aligned to
          the bottom of a two-line block, which put it 10.5pt below the
          title's baseline on every shelf in the app — measured, and
          visible once you know: "View all" floated under its heading
          rather than sitting beside it. Nothing but the title is on
          this line now, so both are single lines and can genuinely
          share a baseline. */}
      <View style={styles.row}>
        <Text style={[styles.title, wide && styles.titleWide]}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          >
            <Text style={[styles.action, hovered && styles.actionHovered]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: { gap: 2 },
  row: {
    flexDirection: 'row',
    // A shared baseline, not flush bottoms. Two texts at different
    // sizes with their boxes bottom-aligned do not read as being on the
    // same line, because the larger one's descender space pushes its
    // baseline up; that is what the hand-tuned three points of padding
    // under the action was compensating for, badly.
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  eyebrow: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  titleWide: { fontSize: 28, lineHeight: 33, color: COLORS.white },
  title: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  action: {
    ...TYPE.labelTiny,
    color: COLORS.mediumGrey,
  },
  actionHovered: { color: COLORS.accent },
});
