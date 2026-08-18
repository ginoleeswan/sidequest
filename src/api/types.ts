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
}

/** Full detail response for /games/{id}. */
export interface GameDetail extends Game {
  description: string;
  platforms?: PlatformRef[];
  genres?: Named[];
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
