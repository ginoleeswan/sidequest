import { StyleSheet, Text, View } from 'react-native';

import { Rail } from './Rail';
import { ScaleButton } from './ScaleButton';
import { SectionHeader } from './SectionHeader';
import { Textured } from './Textured';
import { GENRES, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Moods, not genres. "Strategy" is a taxonomy term; "an evening of
 * plotting" is a feeling somebody actually has at nine o'clock. Each
 * card is a door to a genre page the app already runs - the mood is
 * the label on the door, and the card is built from the brand's own
 * material (plate, texture, a tint) rather than borrowed artwork, so
 * the row reads as the app speaking rather than more catalogue.
 */
interface Mood {
  key: string;
  /** The feeling on the door. */
  name: string;
  /** One line of what is behind it. */
  promise: string;
  /** Which genre page the door opens. */
  genre: string;
  /** The card's tint, over the plate. */
  tint: string;
}

const MOODS: Mood[] = [
  {
    key: 'cozy',
    name: 'Something gentle',
    promise: 'Small worlds, soft edges',
    genre: 'indie',
    tint: 'rgba(126,166,140,0.16)',
  },
  {
    key: 'loud',
    name: 'Big and loud',
    promise: 'The controller does the talking',
    genre: 'shooter',
    tint: 'rgba(214,105,86,0.16)',
  },
  {
    key: 'lost',
    name: 'Get lost somewhere',
    promise: 'Worlds that swallow evenings',
    genre: 'role-playing-games-rpg',
    tint: 'rgba(122,138,196,0.18)',
  },
  {
    key: 'plot',
    name: 'An evening of plotting',
    promise: 'Turns, maps, one more go',
    genre: 'strategy',
    tint: 'rgba(196,168,110,0.16)',
  },
  {
    key: 'story',
    name: 'Tell me a story',
    promise: 'Places with people in them',
    genre: 'adventure',
    tint: 'rgba(158,122,180,0.16)',
  },
  {
    key: 'fast',
    name: 'Need for speed',
    promise: 'Corners taken badly, then well',
    genre: 'racing',
    tint: 'rgba(110,170,196,0.16)',
  },
];

export function MoodShelf({
  onOpen,
  inset = 0,
}: {
  onOpen: (section: Section) => void;
  inset?: number;
}) {
  const doors = MOODS.map((mood) => ({
    mood,
    section: GENRES.find((genre) => genre.key === mood.genre),
  })).filter((door): door is { mood: Mood; section: Section } =>
    Boolean(door.section)
  );

  return (
    <View style={styles.shelf}>
      <SectionHeader title="What are you in the mood for?" />
      <Rail
        data={doors}
        keyExtractor={(door) => door.mood.key}
        inset={inset}
        renderItem={({ mood, section }) => (
          <ScaleButton
            onPress={() => onOpen(section)}
            style={[styles.card, { backgroundColor: COLORS.navy }]}
            activeScale={0.97}
            hoverScale={1.03}
            accessibilityLabel={`${mood.name}: browse ${section.title}`}
          >
            <Textured fill />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: mood.tint }]}
            />
            <Text style={styles.name}>{mood.name}</Text>
            <Text style={styles.promise} numberOfLines={1}>
              {mood.promise}
            </Text>
          </ScaleButton>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: SPACING.sm + 2, marginBottom: SPACING.xl },
  card: {
    width: 200,
    height: 108,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    overflow: 'hidden',
    padding: SPACING.md,
    justifyContent: 'flex-end',
    gap: 2,
  },
  name: {
    fontFamily: 'Noah-Black',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: COLORS.white,
  },
  promise: { ...TYPE.fine, color: COLORS.mediumGrey },
});
