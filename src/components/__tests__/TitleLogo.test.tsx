import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TitleLogo } from '../TitleLogo';

const logo = {
  url: 'https://cdn2.steamgriddb.com/logo/a.png',
  thumb: 'https://cdn2.steamgriddb.com/logo_thumb/a.png',
  width: 2400,
  height: 1200,
  source: 'sgdb' as const,
  style: 'official',
};

/**
 * The publisher's mark where the name would be typed — and the typed
 * name whenever the mark cannot be shown, so the page never loses its
 * title to a missing picture.
 */
describe('the title treatment', () => {
  it('types the name while there is no logo', async () => {
    await render(
      <TitleLogo logo={null} name="Hades" maxWidth={300} maxHeight={80}>
        <Text>Hades</Text>
      </TitleLogo>
    );
    expect(screen.getByText('Hades')).toBeTruthy();
    expect(screen.queryByTestId('title-logo')).toBeNull();
  });

  it('fits the mark inside the box from the dimensions it was given', async () => {
    await render(
      <TitleLogo logo={logo} name="Hades" maxWidth={300} maxHeight={80}>
        <Text>Hades</Text>
      </TitleLogo>
    );
    const box = screen.getByTestId('title-logo');
    // 2:1 into 300×80 is width-bound: 160 tall would overflow, so 80
    // tall and 160 wide.
    expect(box.props.style).toEqual(
      expect.arrayContaining([{ width: 160, height: 80 }])
    );
    expect(box.props.accessibilityLabel).toBe('Hades');
    expect(screen.queryByText('Hades')).toBeNull();
  });

  it('goes back to the typed name if the file will not load', async () => {
    await render(
      <TitleLogo logo={logo} name="Hades" maxWidth={300} maxHeight={80}>
        <Text>Hades</Text>
      </TitleLogo>
    );
    const image = screen.getByTestId('title-logo').children[0];
    await fireEvent(image as never, 'error', { nativeEvent: { error: 'x' } });
    expect(screen.getByText('Hades')).toBeTruthy();
  });
});
