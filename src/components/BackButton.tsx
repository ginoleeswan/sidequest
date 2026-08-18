import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';

export function BackButton() {
  const router = useRouter();
  return (
    <ScaleButton onPress={() => router.back()} style={styles.button}>
      <Ionicons name="chevron-back" style={styles.icon} />
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: COLORS.lightGrey,
    fontSize: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
