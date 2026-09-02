import { Stack } from 'expo-router';

import { NATIVE_STACK_OPTIONS } from '@/lib/nativeStack';

/**
 * A route group as a real stack on native.
 *
 * These groups used to render a `Slot`, which is a navigator with no
 * UI: the whole group was one screen of the root stack. Opening a game
 * from a game's "More like this" swapped the content in place with no
 * push, the header stayed the first game's, and the back control — the
 * button and the edge swipe alike — popped the entire group, so three
 * games deep you landed back on the tab you started from.
 *
 * As a stack, every push inside the group is a push: it animates, it
 * gets its own header, and back means back one. The root stack hides
 * its own header for these groups so there is exactly one; the first
 * screen in here still gets a back button because the root screen
 * behind it has somewhere to go.
 *
 * Web never renders this: each group's `_layout.web.tsx` hands through
 * the compact shell instead, and the browser owns back.
 */
export function GroupStack() {
  return <Stack screenOptions={NATIVE_STACK_OPTIONS} />;
}
