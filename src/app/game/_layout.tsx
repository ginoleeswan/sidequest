import { Slot } from 'expo-router';

/** Native draws its own tab bar; the web sibling adds the phone's. */
export default function Layout() {
  return <Slot />;
}
