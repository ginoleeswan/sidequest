import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * For the mood the whole app exists to serve: too many options, no
 * decision. Picks one of the games already on screen and just opens it.
 */
export function SurpriseButton({ games }: { games: Game[] }) {
  const router = useRouter();
  if (games.length === 0) return null;

  const surprise = () => {
    const pick = games[Math.floor(Math.random() * games.length)];
    if (pick) router.push(`/game/${pick.id}`);
  };

  return (
    <Pressable
      onPress={surprise}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Open a random game"
    >
      <Ionicons name="dice-outline" size={16} color={COLORS.lightGrey} />
      <Text style={styles.label}>Can’t decide? Surprise me</Text>
      <Ionicons name="arrow-forward" size={14} color={COLORS.mediumGrey} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderStyle: 'dashed',
  },
  label: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
});
