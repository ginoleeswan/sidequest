/** Client side of the live-stream lookup. The credentials stay on the server. */

import { apiUrl } from './base';

export interface LiveStream {
  id: string;
  /** The channel's display name. */
  channel: string;
  /** The channel's URL segment, which is not always the display name. */
  login: string;
  title: string;
  viewers: number;
  thumbnail: string;
  language: string;
}

/**
 * Who is playing this game, right now.
 *
 * Nothing about the person asking goes anywhere: the server holds
 * Twitch's app credentials and asks a public question — which streams
 * are live for this category. There is no login here and there cannot
 * be one, which is the same constraint the calendar hand-off works
 * under and for the same reason.
 *
 * An empty list is an ordinary answer, not a failure. Twitch's
 * catalogue is its own, so a game RAWG knows may not be a category
 * there at all, and most games have nobody live most of the time. The
 * caller shows nothing in that case rather than an apology.
 */
export async function fetchLiveStreams(game: string): Promise<LiveStream[]> {
  if (!game.trim()) return [];
  try {
    const res = await fetch(
      apiUrl(`/api/twitch?game=${encodeURIComponent(game)}`)
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { streams?: LiveStream[] };
    return body.streams ?? [];
  } catch {
    // A game page that renders without its streams is a game page. One
    // that throws because Twitch was slow is a broken product.
    return [];
  }
}

/** Where a channel actually lives, for the one link this feature needs. */
export const channelUrl = (login: string) => `https://twitch.tv/${login}`;
