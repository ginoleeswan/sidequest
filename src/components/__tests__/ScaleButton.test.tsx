import { fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';

import { ScaleButton } from '../ScaleButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

/**
 * Every tile in the app is one of these. The spring is decoration; the
 * press-in prefetch and the reduced-motion opt-out are not.
 */
describe('the scale button', () => {
  it('warms the next screen the moment a finger lands', async () => {
    const onPressIn = jest.fn();
    const onPress = jest.fn();
    await render(
      <ScaleButton onPress={onPress} onPressIn={onPressIn}>
        <Text>Open</Text>
      </ScaleButton>
    );
    await fireEvent(screen.getByText('Open'), 'pressIn');
    expect(onPressIn).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('presses', async () => {
    const onPress = jest.fn();
    await render(
      <ScaleButton onPress={onPress}>
        <Text>Open</Text>
      </ScaleButton>
    );
    await fireEvent.press(screen.getByText('Open'));
    expect(onPress).toHaveBeenCalled();
  });

  it('springs on press and on hover', async () => {
    const spring = jest.spyOn(Animated, 'spring');
    await render(
      <ScaleButton onPress={jest.fn()} hoverScale={1.03}>
        <Text>Open</Text>
      </ScaleButton>
    );
    await fireEvent(screen.getByText('Open'), 'pressIn');
    await fireEvent(screen.getByText('Open'), 'hoverIn');
    expect(spring).toHaveBeenCalledTimes(2);
    spring.mockRestore();
  });

  it('does not move at all for someone who asked for less motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const spring = jest.spyOn(Animated, 'spring');
    const onPress = jest.fn();
    await render(
      <ScaleButton onPress={onPress} hoverScale={1.03}>
        <Text>Open</Text>
      </ScaleButton>
    );
    await fireEvent(screen.getByText('Open'), 'pressIn');
    await fireEvent(screen.getByText('Open'), 'hoverIn');
    expect(spring).not.toHaveBeenCalled();
    // Still a button: the state change arrives, it just doesn't travel.
    await fireEvent.press(screen.getByText('Open'));
    expect(onPress).toHaveBeenCalled();
    spring.mockRestore();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('leaves hover alone when no hover scale was asked for', async () => {
    const spring = jest.spyOn(Animated, 'spring');
    await render(
      <ScaleButton onPress={jest.fn()}>
        <Text>Open</Text>
      </ScaleButton>
    );
    await fireEvent(screen.getByText('Open'), 'hoverIn');
    expect(spring).not.toHaveBeenCalled();
    spring.mockRestore();
  });
});
