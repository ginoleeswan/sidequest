import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { TYPE } from '@/styles/typography';

const LABELS = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Great'];

interface Props {
  rating: number; // 0–5 float
  ratingTop: number; // most common vote, 1–5
}

/** Star rating row — replaces react-native-elements' AirbnbRating. */
export function Stars({ rating, ratingTop }: Props) {
  const filled = Math.round(rating);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={i <= filled ? 'star' : 'star-outline'}
            size={20}
            color="#FFD300"
          />
        ))}
      </View>
      <Text style={styles.label}>
        {LABELS[ratingTop] ?? ''} · {rating.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', gap: 4 },
  label: {
    ...TYPE.caption,
    color: COLORS.lightGrey,
  },
});
