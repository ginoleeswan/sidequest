import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeInView } from './FadeInView';
import { Textured } from './Textured';
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
    line: 'Trending, brand new, coming soon, acclaimed.',
  },
  {
    icon: 'bookmark',
    title: 'Save',
    line: 'One tap on any game’s bookmark.',
  },
  {
    icon: 'map',
    title: 'Plan',
    line: 'Your hours a week → what you’ll actually finish.',
  },
];

function StepIcon({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient
      colors={[...BRAND_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.iconRing}
    >
      <View style={styles.iconInner}>
        <Ionicons name={icon} size={17} color={COLORS.white} />
      </View>
    </LinearGradient>
  );
}

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
        <FadeInView style={styles.cardShadow}>
          <View style={styles.card}>
            <Textured fill />
            <LinearGradient
              colors={[...BRAND_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.crown}
            />
            <View style={styles.content}>
              <Text style={styles.hello}>WELCOME TO</Text>
              <Text style={styles.wordmark}>SIDEQUEST</Text>
              <Text style={styles.tagline}>
                Your next game, found — and a plan you’ll actually finish.
              </Text>

              <View style={styles.steps}>
                {STEPS.map((step, index) => (
                  <View key={step.title} style={styles.step}>
                    <StepIcon icon={step.icon} />
                    <View style={styles.stepBody}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepLine}>{step.line}</Text>
                    </View>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
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
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </Pressable>

              <Text style={styles.privacy}>
                No account, no tracking — your library lives on this device.
              </Text>
            </View>
          </View>
        </FadeInView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 25, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  cardShadow: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 24,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  crown: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  content: { padding: SPACING.xl, gap: SPACING.md },
  hello: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    letterSpacing: 2.4,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    letterSpacing: 1,
    color: COLORS.white,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Noah-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  steps: {
    gap: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  iconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#242C3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, gap: 1 },
  stepTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    color: COLORS.lightGrey,
  },
  stepLine: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.mediumGrey,
  },
  stepIndex: {
    fontFamily: 'Noah-Black',
    fontSize: 22,
    color: 'rgba(255,255,255,0.08)',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 1,
    overflow: 'hidden',
    marginTop: SPACING.xs,
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
