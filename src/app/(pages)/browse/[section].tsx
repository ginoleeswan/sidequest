import { useLocalSearchParams } from 'expo-router';

import HomeScreen from '../../(tabs)/index';
import { ALL_SECTIONS } from '@/constants/categories';

/**
 * A section at its own address.
 *
 * "Coming soon" and "RPG" were states of the home page - `/?category=`
 * - which a browser could not bookmark cleanly, a search engine would
 * not index as pages, and a shared link would open as "the home page,
 * then something happens". Each is now a page: pre-rendered at export
 * so the title and the first paint are its own, and listed in the
 * sitemap. The screen is Home's, told which door it is standing in.
 */
export function generateStaticParams() {
  return ALL_SECTIONS.map((section) => ({ section: section.key }));
}

export default function BrowseSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <HomeScreen section={section} routed />;
}
