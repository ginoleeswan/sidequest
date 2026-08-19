import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Textured } from './Textured';
import { reportCrash } from '@/lib/reportCrash';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

interface Props {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * What a route shows when its render throws.
 *
 * expo-router looks for an `ErrorBoundary` export per route; without one
 * a single bad render takes the whole app to a blank screen. This keeps
 * the failure inside the route, offers the two things that actually help
 * (try again, go home), and reports the crash so we hear about it.
 */
export function RouteError({ error, retry }: Props) {
  const router = useRouter();
  reportCrash(error);

  return (
    <Textured style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconRing}>
          <Ionicons name="alert-circle-outline" size={26} color={COLORS.plum} />
        </View>
        <Text style={styles.title}>This screen hit a snag</Text>
        <Text style={styles.detail}>
          Not your fault, and nothing in your library was lost — it lives on
          this device.
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={() => retry()} style={styles.primary}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} style={styles.ghost}>
            <Text style={styles.ghostText}>Go home</Text>
          </Pressable>
        </View>
        {__DEV__ && <Text style={styles.dev}>{String(error?.message)}</Text>}
      </View>
    </Textured>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: COLORS.darkGrey,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    minHeight: 420,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
  },
  detail: {
    fontFamily: 'Noah-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  primary: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  primaryText: {
    fontFamily: 'Noah-Black',
    fontSize: 14,
    color: COLORS.darkGrey,
  },
  ghost: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  ghostText: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.lightGrey,
  },
  dev: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
