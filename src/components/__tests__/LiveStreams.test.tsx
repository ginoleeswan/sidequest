import { screen, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { LiveStreams } from '../LiveStreams';
import type { LiveStream } from '@/api/twitch';
import { renderApp } from '@/test-utils';

jest.mock('@/api/twitch', () => ({
  ...jest.requireActual('@/api/twitch'),
  fetchLiveStreams: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchLiveStreams } = require('@/api/twitch') as {
  fetchLiveStreams: jest.Mock;
};

/**
 * The scroller the row is laid out in.
 *
 * RNTL 14 dropped the UNSAFE_ component queries, and the rail is a
 * FlatList with no text of its own to find it by, so this reads the
 * rendered tree for the node that actually scrolls.
 */
function scroller(): ReactTestRendererJSON {
  const found: ReactTestRendererJSON[] = [];
  const walk = (node: ReactTestRendererJSON | string | null) => {
    if (!node || typeof node === 'string') return;
    if (node.props?.horizontal === true) found.push(node);
    node.children?.forEach(walk);
  };
  walk(screen.toJSON() as ReactTestRendererJSON | null);
  expect(found.length).toBeGreaterThan(0);
  return found[0];
}

const live = (n: number): LiveStream[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    channel: `channel${i}`,
    login: `channel${i}`,
    title: `stream ${i}`,
    viewers: 1234 + i,
    thumbnail: `https://example.com/${i}.jpg`,
    language: 'en',
  }));

/**
 * Somebody playing it, right now.
 *
 * The row's whole argument is that people are playing this game, so it
 * has to survive being empty without leaving a hole, and it has to lay
 * the players out sideways: stacked, a phone column fits one card a
 * line and the least important section on the page becomes its tallest.
 */
describe('who is live', () => {
  beforeEach(() => fetchLiveStreams.mockReset());

  it('says nothing at all when nobody is playing', async () => {
    fetchLiveStreams.mockResolvedValue([]);
    await renderApp(<LiveStreams game="Hades" />);
    await waitFor(() => expect(fetchLiveStreams).toHaveBeenCalled());
    expect(screen.queryByText('Watch someone play')).toBeNull();
  });

  it('says nothing when Twitch cannot be reached', async () => {
    fetchLiveStreams.mockRejectedValue(new Error('no credentials'));
    await renderApp(<LiveStreams game="Hades" />);
    await waitFor(() => expect(fetchLiveStreams).toHaveBeenCalled());
    expect(screen.queryByText('Watch someone play')).toBeNull();
  });

  it('counts the live channels in the eyebrow', async () => {
    fetchLiveStreams.mockResolvedValue(live(3));
    await renderApp(<LiveStreams game="Hades" />);
    expect(await screen.findByText('3 live on Twitch')).toBeTruthy();
    // Not "Playing it now": that phrase is a button further up the same
    // page, where it means the READER is playing it.
    expect(screen.getByText('Watch someone play')).toBeTruthy();
    expect(screen.queryByText('Playing it now')).toBeNull();
  });

  it('lays the channels out sideways, not stacked', async () => {
    fetchLiveStreams.mockResolvedValue(live(6));
    await renderApp(<LiveStreams game="Hades" />);
    await screen.findByText('channel0');
    // A horizontal list, so six live channels cost one card's height
    // rather than six.
    expect(scroller()).toBeTruthy();
  });

  it('runs to the edge of the screen, past the page padding', async () => {
    fetchLiveStreams.mockResolvedValue(live(3));
    await renderApp(<LiveStreams game="Hades" inset={16} />);
    await screen.findByText('channel0');
    // Bled across the page's padding and given it back as a content
    // inset, so the row reaches the edge while its first card still
    // lines up with everything above it.
    const rail = scroller();
    expect(rail.props.contentContainerStyle).toMatchObject({
      paddingHorizontal: 16,
    });
    expect(rail.props.style).toContainEqual({ marginHorizontal: -16 });
  });

  it('sends the reader to the channel, not the display name', async () => {
    fetchLiveStreams.mockResolvedValue([
      { ...live(1)[0], channel: 'Bright Name', login: 'brightname' },
    ]);
    await renderApp(<LiveStreams game="Hades" />);
    const card = await screen.findByLabelText(
      'Watch Bright Name play, 1234 watching, on Twitch'
    );
    expect(card).toBeTruthy();
  });
});
