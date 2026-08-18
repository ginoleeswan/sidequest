import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';

export function BackButton() {
  const router = useRouter();
  // Deep links (shared URLs, fresh tabs) have no history to pop - fall
  // back to home instead of a button that silently does nothing.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  return (
    <ScaleButton
      onPress={goBack}
      style={styles.button}
      accessibilityLabel="Go back"
    >
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
