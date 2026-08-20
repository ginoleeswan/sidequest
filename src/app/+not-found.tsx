import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <PageTitle>Not found — Sidequest</PageTitle>
      <View style={styles.container}>
        <Message
          icon="game-controller-outline"
          title="This screen doesn't exist"
        />
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go back home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.darkGrey,
  },
  link: { alignSelf: 'center', paddingVertical: SPACING.md },
  linkText: {
    ...TYPE.label,
    color: COLORS.blue,
  },
});
