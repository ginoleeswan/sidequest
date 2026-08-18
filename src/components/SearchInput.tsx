import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  inputRef?: React.RefObject<TextInput | null>;
  /** Show the "/" keyboard-shortcut hint (expanded/desktop layouts). */
  showShortcutHint?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  style,
  inputRef,
  showShortcutHint = false,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color={COLORS.mediumGrey} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search games…"
        placeholderTextColor={COLORS.mediumGrey}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={COLORS.mediumGrey} />
        </Pressable>
      ) : showShortcutHint && Platform.OS === 'web' ? (
        <View style={styles.kbd}>
          <Text style={styles.kbdText}>/</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
    width: 200,
    height: 42,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    fontFamily: 'Noah-Regular',
    fontSize: 15,
    color: COLORS.lightGrey,
    paddingVertical: 0,
    // Suppress the browser focus ring; the container border carries focus.
    outlineWidth: 0,
  },
  kbd: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kbdText: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    color: COLORS.mediumGrey,
  },
});
