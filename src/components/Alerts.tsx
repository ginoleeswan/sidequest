import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { LetGoBar } from './LetGoBar';
import { useToast } from './Toast';
import { Touchable } from './Touchable';
import type { Alert } from '@/lib/alerts';
import { recordDrop, type DropReason } from '@/lib/drops';
import { useLibrary } from '@/lib/library';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/**
 * What doesn't fit — one calm place instead of two loud ones.
 *
 * This used to be two features that were secretly one fact. A game
 * whose deadline could not be met got a bordered warning card, four
 * lines of prose, floating at the very top of the page with no title;
 * a game that did not fit the plan's window got a muted row in a
 * section called "Side quests", far below. Elden Ring routinely
 * qualified for BOTH, and appeared on the page twice with two
 * different framings of the same problem: it doesn't fit.
 *
 * So: one section, deduped, and every row is a single line of fact
 * with its ways out beside it. The relief stance (§2.1) is carried by
 * the actions, not by paragraphs — a reader in this section has
 * already been told the truth by the numbers, and what they need is
 * the exits: give it more room, or let it go. Nothing here is a
 * confirmation dialogue; letting go asks why, exactly as the amnesty
 * screen does, because the reason is the only thing the shelves learn
 * from a drop.
 *
 * Due-soon ("that fits") and nearly-done alerts no longer render here
 * at all: a date that is going to be met is the route's story, and a
 * game one evening from credits is Tonight's. This section is only
 * for what actually needs a person.
 *
 * And it is BOUNDED, which took a 1000-game library to notice. The
 * at-risk alerts were always capped at three by the alert engine; the
 * window overflow was not, so a Steam import against a two-week window
 * rendered eight hundred and forty-nine rows of games you cannot
 * finish. A section whose eyebrow reads "and that's allowed" is not
 * allowed to scroll for eight hundred rows — that is the guilt wall
 * §2.1 exists to prevent, built by the feature meant to prevent it.
 *
 * So: a few rows with their exits, then one line naming the rest and
 * pointing at the tool that handles a pile in one go. The count was
 * never the problem; eight hundred rows of it was.
 */

/**
 * How many overflow rows are worth drawing.
 *
 * The at-risk alerts are already capped at three by the alert engine,
 * so the section shows at most six rows and then speaks. Three is
 * enough to make the shape concrete — "these are the sort of thing that
 * did not fit" — without becoming an inventory of everything you own.
 */
const SPILLED_SHOWN = 3;

/** A game the window has no room for, from `schedule.dropped`. */
export interface Overflow {
  id: number;
  name: string;
  hours: number;
}

export function Alerts({
  alerts,
  overflow = [],
  gamesById,
}: {
  alerts: Alert[];
  overflow?: Overflow[];
  /** For the thumbnails; absent covers draw their placeholder. */
  gamesById?: Map<number, Game>;
}) {
  const router = useRouter();
  const { entries, setDeadline, removeMany, importJson } = useLibrary();
  const toast = useToast();

  /**
   * The game somebody has just said they might let go of. Held rather
   * than acted on: the reason is asked for before anything happens.
   */
  const [letting, setLetting] = useState<number | null>(null);

  /**
   * Let it go, and hold the door open behind it.
   *
   * The entry is kept whole before it goes — status, date, note, the
   * hours already played — so Undo puts back exactly what was there
   * rather than a fresh save of the same game. The reason it was given
   * is taken back too: a drop that was undone taught the shelves
   * nothing.
   */
  const letGo = (reason?: DropReason) => {
    if (letting == null) return;
    const kept = entries[String(letting)];
    const count = removeMany([letting]);
    if (reason && count > 0) recordDrop(reason);
    setLetting(null);
    if (count === 0) return;
    toast(
      'Let go. Nothing owed.',
      'checkmark-circle',
      kept
        ? {
            label: 'Undo',
            onPress: () => {
              importJson(JSON.stringify({ [String(kept.game.id)]: kept }));
              if (reason) recordDrop(reason, -1);
            },
          }
        : undefined
    );
  };

  const atRisk = alerts.filter((alert) => alert.kind === 'at-risk');
  // Deduped: a game can miss its date AND overflow the window, and one
  // problem row per game is the point of merging these.
  const shown = new Set(atRisk.map((alert) => alert.gameId));
  const allSpilled = overflow.filter((item) => !shown.has(item.id));
  /**
   * The shortest first, so what is shown is what is nearly within
   * reach rather than whichever thousand-hour game the sort happened
   * to put first. If the window has to grow to fit something, these
   * are the ones it would fit soonest.
   */
  const spilled = [...allSpilled]
    .sort((a, b) => a.hours - b.hours)
    .slice(0, SPILLED_SHOWN);
  const rest = allSpilled.length - spilled.length;

  if (atRisk.length + allSpilled.length === 0) return null;

  const round = (hours: number) => Math.max(1, Math.round(hours));

  const total = atRisk.length + spilled.length;

  const row = (
    id: number,
    name: string,
    fact: string,
    warm: boolean,
    position: number,
    actions: React.ReactNode
  ) => (
    <View
      key={id}
      style={[styles.row, position === total - 1 && styles.rowLast]}
    >
      <CoverImage
        uri={gamesById?.get(id)?.background_image}
        style={styles.thumb}
        size="thumb"
        iconSize={ICON.md}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          {warm && (
            <Ionicons
              name="alert-circle"
              size={ICON.sm}
              color={COLORS.accent}
            />
          )}
          <Text
            style={styles.title}
            numberOfLines={1}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {name}
          </Text>
        </View>
        <Text style={styles.fact} numberOfLines={2}>
          {fact}
        </Text>
        <View style={styles.actions}>{actions}</View>
      </View>
    </View>
  );

  const action = (
    label: string,
    onPress: () => void,
    tone: 'accent' | 'coral' | 'muted' = 'accent',
    accessibilityLabel?: string
  ) => (
    <Touchable
      key={label}
      onPress={onPress}
      hitSlop="text"
      style={styles.actionTarget}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text
        style={[styles.action, styles[tone]]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {label}
      </Text>
    </Touchable>
  );

  return (
    // No panel of its own. This sits inside the Plan's one plate, and a
    // bordered box inside a bordered box started its text sixty-two
    // points in from the screen's edge; the rows now share the plate's
    // edge with every other row on it.
    <View>
      {atRisk.map((alert, index) =>
        row(
          alert.gameId,
          alert.name,
          alert.days != null && alert.days <= 0
            ? 'Past the date you set.'
            : `Needs ${round(alert.hoursLeft)}h — room for about ${round(
                alert.roomHours ?? 0
              )}h before your date.`,
          true,
          index,
          <>
            {action(
              'Drop the date',
              () => {
                setDeadline(alert.gameId, null);
                toast('Date cleared. Nothing owed.', 'checkmark-circle');
              },
              'accent',
              `Clear the date on ${alert.name}`
            )}
            {action(
              'Let it go',
              () => setLetting(alert.gameId),
              'coral',
              `Let ${alert.name} go`
            )}
            {action(
              'Open',
              () => router.push(`/game/${alert.gameId}`),
              'muted',
              `Open ${alert.name}`
            )}
          </>
        )
      )}

      {spilled.map((item, index) =>
        row(
          item.id,
          item.name,
          item.hours > 0
            ? `Needs ~${Math.round(item.hours)}h — more than the window has. It'll still be here.`
            : 'Length unknown, so the window cannot place it.',
          false,
          atRisk.length + index,
          <>
            {action(
              'Let it go',
              () => setLetting(item.id),
              'coral',
              `Let ${item.name} go`
            )}
            {action(
              'Open',
              () => router.push(`/game/${item.id}`),
              'muted',
              `Open ${item.name}`
            )}
          </>
        )
      )}

      {rest > 0 && (
        <Touchable
          style={styles.rest}
          onPress={() => router.push('/tidy')}
          accessibilityLabel={`${rest} more games do not fit — open backlog amnesty`}
        >
          <Text style={styles.restText}>
            {rest} more {rest === 1 ? 'game' : 'games'} the window has no room
            for. Nothing to do about them one at a time —{' '}
            <Text style={styles.restLink}>
              let a few go together{' '}
              <Ionicons
                name="chevron-forward"
                size={ICON.sm - 2}
                color={COLORS.coralText}
              />
            </Text>
          </Text>
        </Touchable>
      )}

      {letting != null && (
        <LetGoBar count={1} onLetGo={letGo} onCancel={() => setLetting(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The one row: a 40pt square of art, a title, one line of fact, the
   * ways out, and a hairline to the next.
   */
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.stroke,
  },
  rowLast: { borderBottomWidth: 0 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.navy,
  },
  body: { flex: 1, gap: SPACING.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  title: { ...TYPE.label, color: COLORS.white, flexShrink: 1 },
  fact: { ...TYPE.caption, color: COLORS.mediumGrey },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  actionTarget: { minHeight: 20, justifyContent: 'center' },
  /**
   * The line that replaces eight hundred rows. Bordered off the last
   * row rather than styled as one, because it is a sentence about the
   * section rather than another thing in it.
   */
  rest: {
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.stroke,
  },
  restText: { ...TYPE.caption, color: COLORS.mediumGrey },
  /** It leads to letting go, so it speaks in that colour. */
  restLink: { color: COLORS.coralText },

  action: { ...TYPE.labelSmall },
  accent: { color: COLORS.accent },
  /** Letting go is coral everywhere in this app; it is coral here. */
  coral: { color: COLORS.coralText },
  muted: { color: COLORS.mediumGrey },
});
