import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/** The meaning a state is spoken in, from the palette's own semantics. */
export type Tone = 'neutral' | 'time' | 'evening' | 'finished' | 'letGo';

const TONE: Record<Tone, string> = {
  neutral: COLORS.lightGrey,
  time: COLORS.accent,
  evening: COLORS.violetText,
  finished: COLORS.mint,
  letGo: COLORS.coralText,
};

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  /** Optional call to action, e.g. "Clear search". */
  actionLabel?: string;
  onAction?: () => void;
  /** A quieter second way on, beside the first. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  tone?: Tone;
  /**
   * Drawn above the words in place of the glyph — an empty state that
   * shows the shape of what will be there, rather than an icon that
   * says nothing is.
   */
  art?: React.ReactNode;
}

/**
 * Centred empty and error state.
 *
 * It was an 88pt grey disc with a grey system icon and a 14pt title the
 * size of a row's — the most template-looking thing in the app, on the
 * screens a new user sees first. The glyph now speaks in the colour of
 * what it is about, the title is a heading, and the way out is the
 * app's one button.
 */
export function Message({
  icon,
  title,
  detail,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone = 'neutral',
  art,
}: Props) {
  return (
    <View style={styles.container}>
      {art ?? (
        <Ionicons
          name={icon}
          size={44}
          color={TONE[tone]}
          style={styles.glyph}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      <Text
        style={styles.title}
        accessibilityRole="header"
        maxFontSizeMultiplier={FONT_SCALE.display}
      >
        {title}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {(actionLabel && onAction) || (secondaryLabel && onSecondary) ? (
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <PrimaryButton label={actionLabel} onPress={onAction} />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <PrimaryButton
              label={secondaryLabel}
              onPress={onSecondary}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  glyph: { marginBottom: SPACING.sm },
  title: {
    ...TYPE.h2,
    color: COLORS.white,
    textAlign: 'center',
  },
  detail: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm2,
    marginTop: SPACING.md,
  },
});
