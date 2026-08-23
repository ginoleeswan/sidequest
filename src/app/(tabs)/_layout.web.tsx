import { Slot } from 'expo-router';

/**
 * Web has no native tab bar, and does not want expo-router's stand-in.
 *
 * The web implementation of `NativeTabs` is a Radix tab list with its
 * own stylesheet — a perfectly good component, and the wrong one here:
 * this app navigates on the web through `Sidebar` on wide screens and
 * `AppHeader` on narrow ones, and a third navigation control would be
 * both redundant and a different design language.
 *
 * So web renders the group's children and nothing else. The `(tabs)`
 * group is a native-only navigator; on web it is just three routes at
 * the same three URLs they have always had.
 */
export default function TabLayoutWeb() {
  return <Slot />;
}
