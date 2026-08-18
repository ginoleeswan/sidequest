import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
}

/** Centred empty / error state. */
export function Message({ icon, title, detail }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={COLORS.mediumGrey} />
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
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
  title: {
    fontFamily: 'Noah-Bold',
    fontSize: 18,
    color: COLORS.lightGrey,
    textAlign: 'center',
  },
  detail: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    maxWidth: 320,
  },
});
