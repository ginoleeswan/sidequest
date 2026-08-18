import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { COLORS } from '@/styles/colors';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchInput({ value, onChangeText }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={COLORS.mediumGrey} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search..."
        placeholderTextColor={COLORS.mediumGrey}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 200,
    height: 40,
    borderRadius: 30,
    paddingHorizontal: 12,
    backgroundColor: COLORS.navy,
  },
  input: {
    flex: 1,
    fontFamily: 'Noah-Regular',
    fontSize: 16,
    color: COLORS.lightGrey,
    paddingVertical: 0,
  },
});
