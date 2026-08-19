import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { StoreLinks } from '../StoreLinks';
import type { StoreLink, StoreRef } from '@/api/types';

const stores: StoreRef[] = [
  { id: 1, store: { id: 1, name: 'Steam' } },
  { id: 2, store: { id: 3, name: 'PlayStation Store' } },
];

const links: StoreLink[] = [
  { id: 1, store_id: 1, url: 'https://store.steampowered.com/app/1' },
];

/** Where to buy it — a storefront with no link is not a link. */
describe('store links', () => {
  it('shows nothing at all when there is nowhere to go', async () => {
    await render(<StoreLinks stores={stores} links={[]} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('lists only the storefronts that came with a URL', async () => {
    await render(<StoreLinks stores={stores} links={links} />);
    expect(screen.getByText('Steam')).toBeTruthy();
    expect(screen.queryByText('PlayStation Store')).toBeNull();
  });

  it('puts the official site first when there is one', async () => {
    await render(
      <StoreLinks stores={stores} links={links} website="https://example.com" />
    );
    const labels = screen
      .getAllByText(/Steam|Official site/)
      .map((n) => n.props.children);
    expect(labels[0]).toBe('Official site');
  });

  it('opens the store when you press it', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<StoreLinks stores={stores} links={links} />);
    await fireEvent.press(screen.getByText('Steam'));
    expect(openURL).toHaveBeenCalledWith(links[0].url);
    openURL.mockRestore();
  });
});
