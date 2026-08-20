import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * What you thought, and what you want to remember.
 *
 * Every score on this screen is somebody else's — Metacritic's, the
 * community's, an average of strangers. This is the only place the app
 * asks what *you* made of it, and the only text in the product that is
 * yours. It stays on the device with the rest of the library.
 */
export function PersonalNote({ gameId }: { gameId: number }) {
  const { entries, setNote, setRating } = useLibrary();
  const entry = entries[String(gameId)];
  const stored = entry?.note ?? '';
  const [draft, setDraft] = useState(stored);

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
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(gameId, rating === star ? 0 : star)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: star <= rating }}
              accessibilityLabel={
                rating === star
                  ? `Clear your rating of ${star} out of 5`
                  : `Rate ${star} out of 5`
              }
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={18}
                color={star <= rating ? COLORS.accent : COLORS.mediumGrey}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => setNote(gameId, draft)}
        onSubmitEditing={() => setNote(gameId, draft)}
        placeholder="Where you got to, why you bounced, who to lend it to…"
        placeholderTextColor={COLORS.mediumGrey}
        multiline
        style={styles.input}
        accessibilityLabel="Your note on this game"
      />

      {draft !== stored && (
        <Pressable
          onPress={() => setNote(gameId, draft)}
          accessibilityRole="button"
          style={styles.save}
        >
          <Text style={styles.saveText}>Save note</Text>
        </Pressable>
      )}
    </View>
  );
}

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
  stars: { flexDirection: 'row', gap: 4 },
  input: {
    ...TYPE.body,
    color: COLORS.lightGrey,
    minHeight: 64,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  save: { alignSelf: 'flex-start' },
  saveText: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
});
