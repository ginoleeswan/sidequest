import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
  });

  /**
   * The typed title and the publisher's mark are two shapes for the
   * same word, and swapping one for the other read on a device as the
   * page changing its mind. So while the lookup is out the slot waits,
   * quietly, and the name is only set if the wait runs long.
   */
  it('holds the slot quiet while the lookup is out, then sets the name', async () => {
    jest.useFakeTimers();
    try {
      await render(
        <TitleLogo logo={undefined} name="Hades" maxWidth={300} maxHeight={80}>
          <Text>Hades</Text>
        </TitleLogo>
      );
      expect(screen.getByText('Hades')).not.toBeVisible();
      // The wait runs out, then the name fades up.
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Hades')).toBeVisible();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the mark without ever typing the name when it arrives in time', async () => {
    await render(
      <TitleLogo logo={logo} name="Hades" maxWidth={300} maxHeight={80}>
        <Text>Hades</Text>
      </TitleLogo>
    );
    expect(screen.getByText('Hades')).not.toBeVisible();
    await fireEvent(image_of(), 'load', { nativeEvent: { source: {} } });
    expect(screen.getByText('Hades')).not.toBeVisible();
    expect(screen.getByTestId('title-logo').props.accessibilityLabel).toBe(
      'Hades'
    );
  });

  it('goes back to the typed name if the file will not load', async () => {
    await render(
      <TitleLogo logo={logo} name="Hades" maxWidth={300} maxHeight={80}>
        <Text>Hades</Text>
      </TitleLogo>
    );
    await fireEvent(image_of(), 'error', { nativeEvent: { error: 'x' } });
    expect(screen.getByText('Hades')).toBeVisible();
    expect(screen.queryByTestId('title-logo')).toBeNull();
  });
});

/** The mark itself. */
function image_of(): never {
  return screen.getByTestId('title-logo-image') as never;
}
