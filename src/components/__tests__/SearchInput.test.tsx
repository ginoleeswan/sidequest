import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SearchInput } from '../SearchInput';

/**
 * The search box is the app's front door. What matters is that typing
 * reaches the caller and that there is always a way back to empty.
 */
/** Platform.OS is a plain property here, so it is set rather than spied. */
function setOS(os: string) {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  return () =>
    Object.defineProperty(Platform, 'OS', {
      value: previous,
      configurable: true,
    });
}

describe('the search input', () => {
  it('reports what you type', async () => {
    const onChangeText = jest.fn();
    await render(<SearchInput value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Search games…'),
      'hades'
    );
    expect(onChangeText).toHaveBeenCalledWith('hades');
  });

  it('offers no clear control while it is empty', async () => {
    await render(<SearchInput value="" onChangeText={jest.fn()} />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
  });

  it('clears back to empty once there is something to clear', async () => {
    const onChangeText = jest.fn();
    await render(<SearchInput value="hades" onChangeText={onChangeText} />);
    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('shows the keyboard shortcut hint only on the web, and only while empty', async () => {
    const restore = setOS('web');
    const { rerender } = await render(
      <SearchInput value="" onChangeText={jest.fn()} showShortcutHint />
    );
    expect(screen.getByText('/')).toBeTruthy();
    await rerender(
      <SearchInput value="h" onChangeText={jest.fn()} showShortcutHint />
    );
    expect(screen.queryByText('/')).toBeNull();
    restore();
  });

  it('keeps the hint off a phone, where there is no keyboard to shortcut', async () => {
    const restore = setOS('ios');
    await render(
      <SearchInput value="" onChangeText={jest.fn()} showShortcutHint />
    );
    expect(screen.queryByText('/')).toBeNull();
    restore();
  });
});
