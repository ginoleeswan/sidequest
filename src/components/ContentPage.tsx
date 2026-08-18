import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from './BackButton';
import { Textured } from './Textured';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

/** Shared layout for static pages: About, Terms, Privacy. */
export function ContentPage({ title, updated, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Textured style={styles.background}>
      <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
        <BackButton />
      </View>
      <View
        style={[
          styles.scroll,
          {
            paddingTop: insets.top + SPACING.xl * 2.5,
            paddingBottom: insets.bottom + 84,
          },
        ]}
      >
        <View style={styles.inner}>
          <View style={styles.accent} />
          <Text style={TYPE.display}>{title}</Text>
          {updated ? (
            <Text style={styles.updated}>Last updated {updated}</Text>
          ) : null}
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Textured>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export function H({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  scroll: { flexGrow: 1 },
  inner: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
  },
  accent: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.plum,
    marginBottom: SPACING.md,
  },
  updated: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.mediumGrey,
    marginTop: SPACING.sm,
  },
  body: { marginTop: SPACING.xl, gap: SPACING.md },
  h: {
    fontFamily: 'Noah-Black',
    fontSize: 18,
    color: COLORS.lightGrey,
    marginTop: SPACING.md,
  },
  p: {
    fontFamily: 'Noah-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.lightGrey,
  },
});
