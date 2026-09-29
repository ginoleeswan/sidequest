import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Touchable } from './Touchable';
import { impact } from '@/lib/haptics';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING, TOUCH } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * What you thought, and what you want to remember.
 *
 * Every score on this screen is somebody else's — Metacritic's, the
 * community's, an average of strangers. This is the only place the app
 * asks what *you* made of it, and the only text in the product that is
 * yours. It stays on the device with the rest of the library.
 */
/**
 * Whether this game has a note box at all.
 *
 * Exported so a caller can decide not to build the block around it. The
 * component already returns null for a game nobody has saved, but a
 * null inside a wrapper is still a wrapper: on the game page it left an
 * empty node at the top of the main column that went on claiming the
 * column's gap, so the two columns opened 40pt out of step with each
 * other for every game not in the library — which is most of them, on
 * the page people arrive at from a link.
 */
export function usePersonalNote(gameId: number): boolean {
  const { entries } = useLibrary();
  return entries[String(gameId)] != null;
}

export function PersonalNote({ gameId }: { gameId: number }) {
  const { entries, setNote, setRating, addTag, removeTag, tags } = useLibrary();
  const entry = entries[String(gameId)];
  const stored = entry?.note ?? '';
  const [draft, setDraft] = useState(stored);
  const [tagDraft, setTagDraft] = useState('');

  // The library arrives after the first render — it is gated on
  // hydration — so the box has to adopt a note that appears later, and
  // to swap when the screen moves to another game. Adjusting state
  // during render is React's own answer to this; an effect would render
  // the empty box first and then correct it.
  const [seen, setSeen] = useState({ note: stored, gameId });
  if (seen.note !== stored || seen.gameId !== gameId) {
    setSeen({ note: stored, gameId });
    setDraft(stored);
  }

  if (!entry) return null;

  const rating = entry.rating ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={TYPE.micro}>YOUR TAKE</Text>
        <View style={styles.stars}>
          {/* Each star is a whole thumb wide. At 18pt with four points
              of slop they were 26pt targets packed edge to edge, so a
              reader aiming for four got three as often as not. */}
          {[1, 2, 3, 4, 5].map((star) => (
            <Touchable
              key={star}
              onPress={() => setRating(gameId, rating === star ? 0 : star)}
              haptic="tap"
              style={styles.star}
              accessibilityState={{ selected: star <= rating }}
              accessibilityLabel={
                rating === star
                  ? `Clear your rating of ${star} out of 5`
                  : `Rate ${star} out of 5`
              }
            >
              {/* The rating's gold, not the accent: a score is not time,
                  and amber on these made the reader's own stars read as
                  the page's primary action. */}
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={ICON.md}
                color={star <= rating ? COLORS.starGold : COLORS.mediumGrey}
              />
            </Touchable>
          ))}
        </View>
      </View>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => setNote(gameId, draft)}
        onSubmitEditing={() => {
          impact();
          setNote(gameId, draft);
        }}
        placeholder="Where you got to, why you bounced, who to lend it to…"
        placeholderTextColor={COLORS.mediumGrey}
        multiline
        style={[styles.input, WEB_INPUT]}
        accessibilityLabel="Your note on this game"
      />

      <View style={styles.tags}>
        {(entry.tags ?? []).map((tag) => (
          <Touchable
            key={tag}
            onPress={() => removeTag(gameId, tag)}
            hitSlop="sm"
            style={styles.tag}
            accessibilityLabel={`Remove the ${tag} shelf`}
          >
            <Text style={styles.tagText}>{tag}</Text>
            <Ionicons name="close" size={11} color={COLORS.mediumGrey} />
          </Touchable>
        ))}
        <TextInput
          value={tagDraft}
          onChangeText={setTagDraft}
          onSubmitEditing={() => {
            impact();
            addTag(gameId, tagDraft);
            setTagDraft('');
          }}
          placeholder="Shelve it as…"
          placeholderTextColor={COLORS.mediumGrey}
          style={[styles.tagInput, WEB_INPUT]}
          accessibilityLabel="Add this game to one of your shelves"
          returnKeyType="done"
        />
      </View>

      {/* Shelves already in use, so a second game joins the same one
          rather than starting "Co-op" next to "co op". */}
      {tagDraft === '' &&
        tags.filter((tag) => !(entry.tags ?? []).includes(tag)).length > 0 && (
          <View style={styles.suggestions}>
            {tags
              .filter((tag) => !(entry.tags ?? []).includes(tag))
              .slice(0, 6)
              .map((tag) => (
                <Touchable
                  key={tag}
                  onPress={() => addTag(gameId, tag)}
                  haptic="impact"
                  hitSlop="text"
                  accessibilityLabel={`Add to ${tag}`}
                >
                  <Text style={styles.suggestion}>+ {tag}</Text>
                </Touchable>
              ))}
          </View>
        )}

      {draft !== stored && (
        <Touchable
          onPress={() => setNote(gameId, draft)}
          haptic="impact"
          style={styles.save}
        >
          <Text style={styles.saveText}>Save note</Text>
        </Touchable>
      )}
    </View>
  );
}

/** 16 on web, or iOS Safari zooms the page on focus and stays there. */
const WEB_INPUT = Platform.OS === 'web' ? { fontSize: 16 } : null;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /**
   * Flush, with the last target's spare width given back so the fifth
   * glyph still lines up with the card's edge.
   */
  stars: {
    flexDirection: 'row',
    marginVertical: -(TOUCH.min - ICON.md) / 2,
    marginRight: -(TOUCH.min - ICON.md) / 2,
  },
  star: {
    width: TOUCH.min,
    height: TOUCH.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...TYPE.body,
    color: COLORS.lightGrey,
    /*
     * One line, not three.
     *
     * The floor was 64 — three lines of body copy — so a one-line note
     * left forty points of nothing between what somebody wrote and the
     * controls under it, and the card was the emptiest-looking object
     * on a page it is supposed to be the most personal part of. Empty,
     * the placeholder wraps to two lines and sets the height itself;
     * written in, the box is the size of the note.
     */
    minHeight: 24,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm2,
    paddingVertical: SPACING.xs,
  },
  tagText: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
  },
  tagInput: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
    minWidth: 90,
    paddingVertical: SPACING.xs,
    outlineWidth: 0,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  suggestion: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  /** A line of text, at a thumb's height. */
  save: {
    alignSelf: 'flex-start',
    minHeight: TOUCH.min,
    justifyContent: 'center',
  },
  saveText: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
});
