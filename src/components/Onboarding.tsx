import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePersistedState } from '@/hooks/usePersistedState';
import { BRAND_GRADIENT, COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

const STEPS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  line: string;
}[] = [
  {
    icon: 'compass',
    title: 'Discover',
    line: 'What’s trending, brand new, coming soon, and acclaimed.',
  },
  {
    icon: 'bookmark',
    title: 'Save',
    line: 'Tap the bookmark on any game — want to play, playing, finished.',
  },
  {
    icon: 'map',
    title: 'Plan',
    line: 'Tell us your hours a week. We’ll tell you what you can actually finish.',
  },
];

/**
 * First-visit welcome. Shows once, then never again (persisted). Rendered
 * only after mount so the server-rendered HTML and first client paint agree.
 */
export function Onboarding() {
  const [done, setDone] = usePersistedState('sidequest.onboarded.v1', false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deliberate: hydration handshake, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || done) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => setDone(true)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[...BRAND_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.crown}
          />
          <Text style={styles.wordmark}>SIDEQUEST</Text>
          <Text style={styles.tagline}>
            Your next game, found — and a plan you’ll actually finish.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={17} color={COLORS.white} />
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>
                    {index + 1}. {step.title}
                  </Text>
                  <Text style={styles.stepLine}>{step.line}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={() => setDone(true)} style={styles.cta}>
            <LinearGradient
              colors={[...BRAND_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <Text style={styles.ctaText}>Start exploring</Text>
          </Pressable>

          <Text style={styles.privacy}>
            No account, no tracking — your library lives on this device.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 19, 28, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    gap: SPACING.md,
    overflow: 'hidden',
  },
  crown: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 26,
    letterSpacing: 0.5,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  tagline: {
    fontFamily: 'Noah-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  steps: { gap: SPACING.md, marginVertical: SPACING.sm },
  step: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    color: COLORS.lightGrey,
  },
  stepLine: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.mediumGrey,
  },
  cta: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  ctaText: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    color: COLORS.white,
  },
  privacy: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.8,
    textAlign: 'center',
  },
});
