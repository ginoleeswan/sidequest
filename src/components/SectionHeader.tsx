import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { Tone } from './Message';
import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { ICON, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/**
 * The eyebrow's colour, from the palette's meanings.
 *
 * Every eyebrow on Home was the same grey, so the page never once used
 * violet, mint or coral: "you saw the credits" and "under 8 hours" were
 * set in the same voice as "the last seven days". A row that is about
 * finishing, or about time, can now say so in the colour the rest of the
 * app gives that idea.
 */
const EYEBROW: Record<Tone, string> = {
  neutral: COLORS.mediumGrey,
  time: COLORS.accent,
  evening: COLORS.violetText,
  finished: COLORS.mint,
  letGo: COLORS.coralText,
};

/** A typed arrow at the end of a label: Geom and Noah have no glyph for it. */
const TRAILING_ARROW = /\s*→\s*$/;

interface Props {
  title: string;
  /** Small muted line above the title, e.g. a count. */
  eyebrow?: string;
  /** What the eyebrow is about, in the palette's terms. */
  tone?: Tone;
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
  /**
   * The head of a chapter: a group of rows rather than one row.
   *
   * A long page where every row wears the same 19pt heading scrolls as
   * one texture; the rows that are about you and the rows that are a
   * shop read as the same kind of thing. A chapter heading is a step
   * louder and in the display face, so the page has somewhere to turn.
   */
  chapter?: boolean;
  actionLabel?: string;
  /**
   * What a screen reader should say instead of the visible label.
   *
   * Where the visible text is shorthand — "View all" — the spoken
   * version can say the whole thing: "View all Trending now".
   */
  actionAccessibilityLabel?: string;
  /** A chevron after the action, for an action that goes somewhere. */
  actionChevron?: boolean;
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
  tone = 'neutral',
  wide = false,
  chapter = false,
  actionLabel,
  actionAccessibilityLabel,
  actionChevron = false,
  onAction,
  onAccount,
}: Props) {
  const [hovered, setHovered] = useState(false);
  /**
   * "Share →" and "Plan my backlog →" were typed arrows, which neither
   * face carries — the glyph fell back to the system font at its own
   * weight and baseline, and VoiceOver read it out as "right arrow".
   * The arrow is drawn as a chevron icon instead, whoever asked for it.
   */
  const arrowed = actionLabel ? TRAILING_ARROW.test(actionLabel) : false;
  const label = actionLabel?.replace(TRAILING_ARROW, '');
  const chevron = actionChevron || arrowed;
  const actionColor = hovered ? COLORS.accent : COLORS.mediumGrey;

  return (
    <View style={styles.header}>
      {eyebrow || onAccount ? (
        <View style={styles.topRow}>
          <Text
            style={[styles.eyebrow, { color: EYEBROW[tone] }]}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {eyebrow ?? ''}
          </Text>
          {onAccount ? (
            <Touchable
              onPress={onAccount}
              hitSlop="md"
              accessibilityLabel="You"
            >
              <Ionicons
                name="person-circle-outline"
                size={ICON.lg}
                color={COLORS.mediumGrey}
              />
            </Touchable>
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
        <Text
          style={[
            styles.title,
            wide && styles.titleWide,
            chapter && styles.titleChapter,
          ]}
          accessibilityRole="header"
          maxFontSizeMultiplier={
            wide || chapter ? FONT_SCALE.display : FONT_SCALE.label
          }
        >
          {title}
        </Text>
        {label && onAction ? (
          <Touchable
            onPress={onAction}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            hitSlop="text"
            style={styles.action}
            accessibilityLabel={actionAccessibilityLabel ?? label}
          >
            <Text
              style={[styles.actionText, { color: actionColor }]}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {label}
            </Text>
            {chevron ? (
              <Ionicons
                name="chevron-forward"
                size={ICON.sm}
                color={actionColor}
              />
            ) : null}
          </Touchable>
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
  header: { gap: SPACING.xxs },
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
  titleWide: { ...TYPE.title, color: COLORS.white },
  titleChapter: { ...TYPE.h1, color: COLORS.white },
  title: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
  actionText: {
    ...TYPE.labelTiny,
  },
});
