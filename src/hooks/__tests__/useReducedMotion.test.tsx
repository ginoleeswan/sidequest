import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { useReducedMotion } from '../useReducedMotion';

/**
 * jest-expo runs as native, so these exercise the AccessibilityInfo path.
 * The methods are spied on individually rather than the module being
 * replaced: spreading react-native triggers its lazy getters and drags in
 * every native module the hook has nothing to do with.
 */
function Probe() {
  return <Text>{useReducedMotion() ? 'reduced' : 'full'}</Text>;
}

let emit: (value: boolean) => void = () => {};

beforeEach(() => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    _event: string,
    handler: (value: boolean) => void
  ) => {
    emit = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
});

afterEach(() => jest.restoreAllMocks());

describe('useReducedMotion', () => {
  it('assumes motion is welcome until the system says otherwise', async () => {
    await render(<Probe />);
    expect(screen.getByText('full')).toBeTruthy();
  });

  it('reports the setting the system starts with', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await render(<Probe />);
    expect(await screen.findByText('reduced')).toBeTruthy();
  });

  it('follows the setting changing while the app is open', async () => {
    await render(<Probe />);
    expect(screen.getByText('full')).toBeTruthy();

    await act(async () => emit(true));
    expect(await screen.findByText('reduced')).toBeTruthy();
  });
});
