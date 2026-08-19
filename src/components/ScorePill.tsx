import { StyleSheet, Text, View } from 'react-native';
import { TYPE } from '@/styles/typography';

interface Props {
  score: number;
  size?: 'sm' | 'md';
}

/** Metacritic score in its canonical green / amber / red. */
export function ScorePill({ score, size = 'md' }: Props) {
  const color = score >= 75 ? '#6DC849' : score >= 50 ? '#FDCA52' : '#FC4B37';
  const small = size === 'sm';
  return (
    <View style={[styles.pill, small && styles.pillSm, { borderColor: color }]}>
      <Text style={[styles.score, small && styles.scoreSm, { color }]}>
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pillSm: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  score: { ...TYPE.h4 },
  scoreSm: { fontSize: 11 },
});
