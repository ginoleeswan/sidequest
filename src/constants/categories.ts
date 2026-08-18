import { getGames, getMustPlayGames, getTrendingGames } from '@/api/rawg';
import type { Game } from '@/api/types';
import type { IconType } from '@/components/DynamicIcon';

export interface Category {
  key: string;
  title: string;
  fetch: () => Promise<{ results: Game[] }>;
  iconName: string;
  iconType: IconType;
}

export const CATEGORIES: Category[] = [
  {
    key: 'trending',
    title: 'Trending',
    fetch: getTrendingGames,
    iconName: 'trending-up',
    iconType: 'feather',
  },
  {
    key: 'must-play',
    title: 'Must Play',
    fetch: getMustPlayGames,
    iconName: 'star',
    iconType: 'material-community',
  },
  {
    key: 'indie',
    title: 'Indie',
    fetch: () => getGames('indie'),
    iconName: 'heart',
    iconType: 'material-community',
  },
  {
    key: 'racing',
    title: 'Racing',
    fetch: () => getGames('racing'),
    iconName: 'car',
    iconType: 'font-awesome-5',
  },
  {
    key: 'strategy',
    title: 'Strategy',
    fetch: () => getGames('strategy'),
    iconName: 'strategy',
    iconType: 'material-community',
  },
  {
    key: 'simulation',
    title: 'Simulation',
    fetch: () => getGames('simulation'),
    iconName: 'person',
    iconType: 'ionicon',
  },
  {
    key: 'casual',
    title: 'Casual',
    fetch: () => getGames('casual'),
    iconName: 'checkerboard',
    iconType: 'material-community',
  },
  {
    key: 'sports',
    title: 'Sport',
    fetch: () => getGames('sports'),
    iconName: 'soccer',
    iconType: 'material-community',
  },
  {
    key: 'shooter',
    title: 'Shooter',
    fetch: () => getGames('shooter'),
    iconName: 'crosshairs',
    iconType: 'font-awesome-5',
  },
  {
    key: 'rpg',
    title: 'RPG',
    fetch: () => getGames('role-playing-games-rpg'),
    iconName: 'shield',
    iconType: 'material-community',
  },
  {
    key: 'adventure',
    title: 'Adventure',
    fetch: () => getGames('adventure'),
    iconName: 'compass',
    iconType: 'material-community',
  },
];

export const SEARCH_SECTION = {
  title: 'Search',
  iconName: 'search',
  iconType: 'material-icons' as IconType,
};
