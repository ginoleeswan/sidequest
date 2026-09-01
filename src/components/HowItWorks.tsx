import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import { Words } from './Words';
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
    hue: COLORS.accent,
    title: 'Save what catches your eye',
    body: 'Sidequest looks up how long each takes while you browse.',
  },
  {
    icon: 'moon' as const,
    hue: COLORS.violet,
    title: 'Say how much you play',
    body: 'One number, in hours a week.',
  },
  {
    icon: 'checkmark-circle' as const,
    hue: COLORS.mint,
    title: 'Get one game, not forty',
    body: 'What you can finish, in order — and what to let go.',
  },
];

/** Draws no band of its own: it is placed inside one. */
export function HowItWorks({ scale }: { scale: LandingScale }) {
  return (
    <View style={styles.section}>
      <Rise from="mask">
        <Text style={styles.eyebrow}>All of it takes about a minute</Text>
      </Rise>
      <Words
        text="How it works"
        style={[styles.heading, scale.lead]}
        delay={70}
      />
      <View style={[styles.steps, scale.wide && styles.stepsWide]}>
        {STEPS.map((step, index) => (
          <Rise key={step.title} delay={index * 110} style={styles.stepSlot}>
            <View style={styles.step}>
              {/* The numeral is the furniture. Set at display size in
                  the step's own colour it does the work an icon in a
                  circle was doing badly — you can read the order of
                  this section from across a room. */}
              <Text
                style={[
                  styles.number,
                  { color: step.hue },
                  scale.wide && styles.numberWide,
                ]}
              >
                {`0${index + 1}`}
              </Text>
              <View style={styles.stepHead}>
                <View style={[styles.badge, { backgroundColor: step.hue }]}>
                  <Ionicons name={step.icon} size={22} color={COLORS.navy} />
                </View>
                <Text style={[styles.title, scale.wide && styles.titleWide]}>
                  {step.title}
                </Text>
              </View>
              <Text style={[styles.body, scale.body]}>{step.body}</Text>
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
  steps: { gap: SPACING.xl * 1.4 },
  stepsWide: { flexDirection: 'row', gap: SPACING.xl * 1.6 },
  stepSlot: { flex: 1 },
  step: {
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.strokeStrong,
  },
  number: {
    fontFamily: 'Geom-Bold',
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -2,
  },
  numberWide: { fontSize: 66, lineHeight: 70, letterSpacing: -3 },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...TYPE.title, fontSize: 22, color: COLORS.white, flex: 1 },
  titleWide: { fontSize: 26 },
  body: { maxWidth: 360, marginTop: 2 },
});
