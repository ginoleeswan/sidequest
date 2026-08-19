import {
  getComingSoon,
  getGames,
  getMustPlayGames,
  getNewReleases,
  getTopRated,
  getTrendingGames,
} from '@/api/rawg';
import type { BrowseFilters } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import type { IconType } from '@/components/DynamicIcon';

export type ShelfVariant = 'default' | 'ranked' | 'dated' | 'large';

export interface Section {
  key: string;
  title: string;
  fetch: (page?: number, filters?: BrowseFilters) => Promise<Paged<Game>>;
  iconName: string;
  iconType: IconType;
  /** How this section's home shelf is presented. */
  variant?: ShelfVariant;
  /** One editorial line for the section's own page. */
  description?: string;
}

/** Editorial discovery sections — the storefront shelves. */
export const DISCOVER: Section[] = [
  {
    key: 'trending',
    description: 'What everyone’s actually playing this week — the games eating the group chat.',
    title: 'Trending now',
    fetch: getTrendingGames,
    iconName: 'trending-up',
    iconType: 'feather',
    variant: 'ranked',
  },
  {
    key: 'new-releases',
    description: 'Fresh off the press. New this window, sorted by who’s picking them up.',
    title: 'New releases',
    fetch: getNewReleases,
    iconName: 'sparkles',
    iconType: 'ionicon',
  },
  {
    key: 'coming-soon',
    description: 'Wishlist fuel. What’s landing next — bookmark now, thank yourself later.',
    title: 'Coming soon',
    fetch: getComingSoon,
    iconName: 'calendar',
    iconType: 'feather',
    variant: 'dated',
  },
  {
    key: 'top-rated',
    description: 'The canon. Metacritic’s finest from the last few years, no filler.',
    title: 'Critically acclaimed',
    fetch: getTopRated,
    iconName: 'trophy',
    iconType: 'ionicon',
    variant: 'large',
  },
  {
    key: 'must-play',
    description: 'The all-timers. If it’s here, it earned it.',
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
    description: 'Small teams, enormous swings. Where the weird, brilliant stuff lives.',
    title: 'Indie',
    fetch: (p, f) => getGames('indie', p, f),
    iconName: 'heart',
    iconType: 'material-community',
  },
  {
    key: 'role-playing-games-rpg',
    description: 'Builds, quests, and hundred-hour spreadsheets you’ll call a hobby.',
    title: 'RPG',
    fetch: (p, f) => getGames('role-playing-games-rpg', p, f),
    iconName: 'shield',
    iconType: 'material-community',
  },
  {
    key: 'adventure',
    description: 'Stories first. Worlds worth getting lost in, one chapter a night.',
    title: 'Adventure',
    fetch: (p, f) => getGames('adventure', p, f),
    iconName: 'compass',
    iconType: 'material-community',
  },
  {
    key: 'strategy',
    description: 'One more turn. You already know how this ends — at 2am.',
    title: 'Strategy',
    fetch: (p, f) => getGames('strategy', p, f),
    iconName: 'strategy',
    iconType: 'material-community',
  },
  {
    key: 'shooter',
    description: 'Twitch reflexes and tactical brains, from arena to extraction.',
    title: 'Shooter',
    fetch: (p, f) => getGames('shooter', p, f),
    iconName: 'crosshairs',
    iconType: 'font-awesome-5',
  },
  {
    key: 'racing',
    description: 'Apex hunting. Arcade drifts to millimetre-perfect sims.',
    title: 'Racing',
    fetch: (p, f) => getGames('racing', p, f),
    iconName: 'car',
    iconType: 'font-awesome-5',
  },
  {
    key: 'simulation',
    description: 'Build, farm, fly, manage. Peaceful obsession, systems all the way down.',
    title: 'Simulation',
    fetch: (p, f) => getGames('simulation', p, f),
    iconName: 'person',
    iconType: 'ionicon',
  },
  {
    key: 'sports',
    description: 'The beautiful games. Season modes and last-minute winners.',
    title: 'Sport',
    fetch: (p, f) => getGames('sports', p, f),
    iconName: 'soccer',
    iconType: 'material-community',
  },
  {
    key: 'casual',
    description: 'Low stakes, high comfort. Games that respect a twenty-minute window.',
    title: 'Casual',
    fetch: (p, f) => getGames('casual', p, f),
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
