import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  inputRef?: React.RefObject<TextInput | null>;
  /** Show the "/" keyboard-shortcut hint (expanded/desktop layouts). */
  showShortcutHint?: boolean;
  /** Focus on mount — the compact header's search mode opens ready to type. */
  autoFocus?: boolean;
  /** The return key was pressed with this text in the box. */
  onSubmit?: (text: string) => void;
}

export function SearchInput({
  value,
  onChangeText,
  style,
  inputRef,
  showShortcutHint = false,
  autoFocus = false,
  onSubmit,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={ICON.md} color={COLORS.mediumGrey} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search games…"
        placeholderTextColor={COLORS.mediumGrey}
        style={[styles.input, WEB_INPUT]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        maxFontSizeMultiplier={FONT_SCALE.label}
        onSubmitEditing={() => onSubmit?.(value)}
      />
      {value.length > 0 ? (
        <Touchable
          onPress={() => onChangeText('')}
          hitSlop="md"
          accessibilityLabel="Clear search"
        >
          <Ionicons
            name="close-circle"
            size={ICON.md}
            color={COLORS.mediumGrey}
          />
        </Touchable>
      ) : showShortcutHint && Platform.OS === 'web' ? (
        <View style={styles.kbd}>
          <Text style={styles.kbdText}>/</Text>
        </View>
      ) : null}
    </View>
  );
}

/** 16 on web, or iOS Safari zooms the page on focus and stays there. */
const WEB_INPUT = Platform.OS === 'web' ? { fontSize: 16 } : null;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
    width: 200,
    // A minimum: at a larger text size the field grows with its words
    // instead of clipping them.
    minHeight: 42,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.stroke,
  },
  input: {
    ...TYPE.body,
    flex: 1,
    // 16px or larger, always: iOS Safari zooms the page when a smaller
    // input takes focus, and there is no way to opt out of that without
    // also disabling pinch-zoom for everyone.
    color: COLORS.lightGrey,
    paddingVertical: 0,
    // Suppress the browser focus ring; the container border carries focus.
    outlineWidth: 0,
  },
  kbd: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.xs + SPACING.xxs,
    paddingVertical: 1,
  },
  kbdText: {
    ...TYPE.labelTiny,
    color: COLORS.mediumGrey,
  },
});
