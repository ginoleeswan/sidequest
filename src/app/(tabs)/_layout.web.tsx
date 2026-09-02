import { CompactWebShell } from '@/components/CompactWebShell';

/**
 * Web has no native tab bar, and does not want expo-router's stand-in.
 * The web implementation of `NativeTabs` is a Radix tab list with its
 * own stylesheet - a perfectly good component, and the wrong one here:
 * on a wide screen this app navigates through `Sidebar`, and on a
 * phone through the bar `CompactWebShell` draws.
 */
export default function TabLayoutWeb() {
  return <CompactWebShell />;
}
