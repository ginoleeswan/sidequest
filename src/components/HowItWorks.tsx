import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import type { LandingScale } from '@/styles/landing';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * What you actually do, in three steps.
 *
 * Everything else on this page describes what the app is like. Nobody
 * arrives wanting a description — they want to know what will be asked
 * of them, and whether it is worth it. Three numbered steps is the
 * plainest device there is for that, and plain is the point.
 *
 * The icons are wayfinding, not decoration. An icon above a heading in a
 * feature grid is a shape somebody added because the box looked empty;
 * an icon inside a numbered step tells you at a glance which step is
 * which when you come back to the page and skim it. They are drawn from
 * the same subset the app itself ships, so nothing new is downloaded to
 * show them.
 */
const STEPS = [
  {
    icon: 'bookmark' as const,
    title: 'Save what catches your eye',
    body: 'Anything at all. Sidequest looks up how long each one takes while you browse.',
  },
  {
    icon: 'moon' as const,
    title: 'Say how much you play',
    body: 'One number, in hours a week. Change it whenever the answer changes.',
  },
  {
    icon: 'checkmark-circle' as const,
    title: 'Get one game, not forty',
    body: 'It names what you can finish, in the order to play it, and what to let go.',
  },
];

/** Draws no band of its own: it is placed inside one. */
export function HowItWorks({ scale }: { scale: LandingScale }) {
  return (
    <View style={styles.section}>
      <Rise from="mask">
        <Text style={styles.eyebrow}>All of it takes about a minute</Text>
      </Rise>
      <Rise from="mask" delay={70}>
        <Text style={[styles.heading, scale.lead]}>How it works</Text>
      </Rise>
      <View style={[styles.steps, scale.wide && styles.stepsWide]}>
        {STEPS.map((step, index) => (
          <Rise key={step.title} delay={index * 110} style={styles.stepSlot}>
            <View style={styles.step}>
              <View style={styles.badge}>
                <Ionicons name={step.icon} size={17} color={COLORS.navy} />
              </View>
              <Text style={styles.number}>{`0${index + 1}`}</Text>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </View>
          </Rise>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.sm },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  heading: { color: COLORS.white, marginBottom: SPACING.xl },
  // The steps sit further apart than the app's row gap: at this heading
  // size a 20px gutter reads as three things touching.
  steps: { gap: SPACING.lg },
  stepsWide: { flexDirection: 'row', gap: SPACING.xl * 1.6 },
  stepSlot: { flex: 1 },
  step: {
    gap: SPACING.xs + 1,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.strokeStrong,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  number: { ...TYPE.tag, color: COLORS.mediumGrey },
  title: { ...TYPE.h1, color: COLORS.white },
  body: { ...TYPE.body, color: COLORS.mediumGrey, maxWidth: 340, marginTop: 2 },
});
