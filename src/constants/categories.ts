import {
  getComingSoon,
  getGames,
  getMustPlayGames,
  getNewReleases,
  getTopRated,
  getTrendingGames,
} from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import type { IconType } from '@/components/DynamicIcon';

export interface Section {
  key: string;
  title: string;
  fetch: (page?: number) => Promise<Paged<Game>>;
  iconName: string;
  iconType: IconType;
}

/** Editorial discovery sections — the storefront shelves. */
export const DISCOVER: Section[] = [
  {
    key: 'trending',
    title: 'Trending now',
    fetch: getTrendingGames,
    iconName: 'trending-up',
    iconType: 'feather',
  },
  {
    key: 'new-releases',
    title: 'New releases',
    fetch: getNewReleases,
    iconName: 'sparkles',
    iconType: 'ionicon',
  },
  {
    key: 'coming-soon',
    title: 'Coming soon',
    fetch: getComingSoon,
    iconName: 'calendar',
    iconType: 'feather',
  },
  {
    key: 'top-rated',
    title: 'Critically acclaimed',
    fetch: getTopRated,
    iconName: 'trophy',
    iconType: 'ionicon',
  },
  {
    key: 'must-play',
    title: 'Must play',
    fetch: getMustPlayGames,
    iconName: 'star',
    iconType: 'material-community',
  },
];

/** Genre browsing. Keys double as RAWG genre slugs. */
export const GENRES: Section[] = [
  {
    key: 'indie',
    title: 'Indie',
    fetch: (p) => getGames('indie', p),
    iconName: 'heart',
    iconType: 'material-community',
  },
  {
    key: 'role-playing-games-rpg',
    title: 'RPG',
    fetch: (p) => getGames('role-playing-games-rpg', p),
    iconName: 'shield',
    iconType: 'material-community',
  },
  {
    key: 'adventure',
    title: 'Adventure',
    fetch: (p) => getGames('adventure', p),
    iconName: 'compass',
    iconType: 'material-community',
  },
  {
    key: 'strategy',
    title: 'Strategy',
    fetch: (p) => getGames('strategy', p),
    iconName: 'strategy',
    iconType: 'material-community',
  },
  {
    key: 'shooter',
    title: 'Shooter',
    fetch: (p) => getGames('shooter', p),
    iconName: 'crosshairs',
    iconType: 'font-awesome-5',
  },
  {
    key: 'racing',
    title: 'Racing',
    fetch: (p) => getGames('racing', p),
    iconName: 'car',
    iconType: 'font-awesome-5',
  },
  {
    key: 'simulation',
    title: 'Simulation',
    fetch: (p) => getGames('simulation', p),
    iconName: 'person',
    iconType: 'ionicon',
  },
  {
    key: 'sports',
    title: 'Sport',
    fetch: (p) => getGames('sports', p),
    iconName: 'soccer',
    iconType: 'material-community',
  },
  {
    key: 'casual',
    title: 'Casual',
    fetch: (p) => getGames('casual', p),
    iconName: 'checkerboard',
    iconType: 'material-community',
  },
];

/** Shelves shown on the Home storefront, in order. Trending feeds the hero. */
export const HOME_SHELVES: Section[] = [
  DISCOVER[1], // New releases
  DISCOVER[2], // Coming soon
  DISCOVER[3], // Critically acclaimed
  GENRES[0], // Indie
  GENRES[1], // RPG
];

export const ALL_SECTIONS: Section[] = [...DISCOVER, ...GENRES];

export const findSection = (key: string): Section | undefined =>
  ALL_SECTIONS.find((s) => s.key === key);

export const SEARCH_SECTION = {
  title: 'Search',
  iconName: 'search',
  iconType: 'material-icons' as IconType,
};
