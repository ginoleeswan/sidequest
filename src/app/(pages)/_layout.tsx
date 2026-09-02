import { Slot } from 'expo-router';

/**
 * The standalone pages - You, the legal pages, the tools - grouped so
 * one web layout can put the phone's tab bar under them. The group is
 * invisible in the URL: /you is still /you.
 */
export default function PagesLayout() {
  return <Slot />;
}
