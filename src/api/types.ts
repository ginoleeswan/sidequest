export interface PlatformRef {
  platform: { id: number; slug: string; name: string };
}

export interface Named {
  id: number;
  name: string;
  slug?: string;
}

/** Shape shared by RAWG list results and detail responses. */
export interface Game {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  rating: number;
  rating_top: number;
  released: string | null;
  playtime: number;
  metacritic?: number | null;
  parent_platforms?: PlatformRef[];
  genres?: Named[];
  short_screenshots?: { id: number; image: string }[];
}

export interface RatingBucket {
  id: number;
  title: string; // exceptional | recommended | meh | skip
  count: number;
  percent: number;
}

export interface AddedByStatus {
  yet?: number;
  owned?: number;
  beaten?: number;
  toplay?: number;
  dropped?: number;
  playing?: number;
}

export interface StoreRef {
  id: number;
  store: { id: number; name: string; domain?: string };
}

export interface StoreLink {
  id: number;
  store_id: number;
  url: string;
}

/** Full detail response for /games/{id}. */
export interface GameDetail extends Game {
  description: string;
  website?: string;
  esrb_rating?: { id: number; name: string } | null;
  ratings?: RatingBucket[];
  added_by_status?: AddedByStatus | null;
  stores?: StoreRef[];
  platforms?: PlatformRef[];
  developers?: Named[];
  publishers?: Named[];
  tags?: Named[];
}

export interface Screenshot {
  id: number;
  image: string;
}

export interface Movie {
  id: number;
  name: string;
  preview: string;
  data: { max: string };
}

export interface Paged<T> {
  count: number;
  next?: string | null;
  results: T[];
}

/** RAWG /collections/{slug}/feed wraps each game in a feed item. */
export interface CollectionFeedItem {
  game: Game;
}
