import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from './AppHeader';
import { PageTitle } from './PageTitle';
import { Screen } from './Screen';
import { BackButton } from './BackButton';
import { SiteFooter } from './SiteFooter';
import { Textured } from './Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  title: string;
  updated?: string;
  /** Browser-tab title; defaults to the page's own heading. */
  documentTitle?: string;
  children: React.ReactNode;
}

/** Shared layout for static pages: About, Terms, Privacy. */
export function ContentPage({
  title,
  updated,
  documentTitle,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = useTopPad(true);
  const { isExpanded } = useBreakpoint();
  return (
    <Textured style={styles.background}>
      <PageTitle>{`${documentTitle ?? title} — Sidequest`}</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}
      <Screen>
        <View
          style={[
            styles.scroll,
            {
              paddingTop: topPad,
              paddingBottom: SPACING.xl * 1.5,
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
        <SiteFooter />
      </Screen>
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
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  scroll: { flexGrow: 1 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
  },
  accent: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginBottom: SPACING.md,
  },
  updated: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.sm,
  },
  body: { marginTop: SPACING.xl, gap: SPACING.md },
  h: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
    marginTop: SPACING.md,
  },
  p: {
    ...TYPE.body,
    color: COLORS.lightGrey,
  },
});
