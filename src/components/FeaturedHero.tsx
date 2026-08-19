import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { Textured } from './Textured';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';

interface Props {
  games: Game[];
}

/**
 * Expanded-layout hero: one large feature plus a stack of runners-up.
 * Gives the desktop grid a focal point instead of an undifferentiated wall.
 */
export function FeaturedHero({ games }: Props) {
  const router = useRouter();
  const [lead, ...rest] = games;
  if (!lead) return null;

  return (
    <View style={styles.container}>
      <ScaleButton
        onPress={() => router.push(`/game/${lead.id}`)}
        style={styles.leadWrapper}
        activeScale={0.99}
      >
        <View style={styles.lead}>
          <CoverImage
            uri={lead.background_image}
            style={styles.image}
            iconSize={64}
          />
          <Textured fill />
          <LinearGradient
            colors={['#00000000', '#00000080', '#000000d9']}
            locations={[0.3, 0.68, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />
          <View style={styles.leadCopy}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrow}>FEATURED</Text>
            </View>
            <Text style={styles.leadTitle} numberOfLines={2}>
              {lead.name}
            </Text>
            <View style={styles.metaRow}>
              {lead.metacritic != null && (
                <ScorePill score={lead.metacritic} size="sm" />
              )}
              <Ionicons name="star" size={14} color="#FFD300" />
              <Text style={styles.meta}>{lead.rating.toFixed(1)}</Text>
              {lead.released ? (
                <Text style={styles.meta}>· {lead.released.slice(0, 4)}</Text>
              ) : null}
              {lead.genres?.[0] ? (
                <Text style={styles.meta}>· {lead.genres[0].name}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </ScaleButton>

      <View style={styles.rail}>
        {rest.slice(0, 3).map((game) => (
          <Pressable
            key={game.id}
            onPress={() => router.push(`/game/${game.id}`)}
            style={styles.railItem}
          >
            <CoverImage
              uri={game.background_image}
              style={styles.railImage}
              iconSize={24}
            />
            <View style={styles.railCopy}>
              <Text style={styles.railTitle} numberOfLines={2}>
                {game.name}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="star" size={12} color="#FFD300" />
                <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  leadWrapper: { flex: 2 },
  lead: {
    height: 320,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    ...SHADOW.card,
  },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  leadCopy: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowBar: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  eyebrow: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.lightGrey,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  leadTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 28,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rail: { flex: 1, gap: SPACING.md, justifyContent: 'space-between' },
  railItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  railImage: { width: 96, height: '100%' },
  railCopy: { flex: 1, paddingRight: SPACING.sm + 2, gap: SPACING.xs },
  railTitle: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.lightGrey,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  meta: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
});
