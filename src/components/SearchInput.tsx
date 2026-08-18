import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
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
}

export function SearchInput({ value, onChangeText, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color={COLORS.mediumGrey} />
      <TextInput
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
});
