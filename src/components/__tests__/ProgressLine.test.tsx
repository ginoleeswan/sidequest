import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { ProgressLine } from '../ProgressLine';
import { useReducedMotion } from '@/hooks/useReducedMotion';

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

/**
 * The sweep that says "more results are coming" over answers you can
 * still read. Its one real obligation is to stop when the person has
 * asked the system for less motion.
 */
describe('the progress line', () => {
  it('renders a track with a bar in it', async () => {
    await render(<ProgressLine />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('sweeps on its own, and stops when it unmounts', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    const { unmount } = await render(<ProgressLine />);
    expect(loop).toHaveBeenCalled();
    const stop = jest.spyOn(loop.mock.results[0].value, 'stop');
    await unmount();
    expect(stop).toHaveBeenCalled();
    loop.mockRestore();
  });

  it('holds still for someone who asked the system for less motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValueOnce(true);
    const loop = jest.spyOn(Animated, 'loop');
    await render(<ProgressLine />);
    expect(loop).not.toHaveBeenCalled();
    loop.mockRestore();
  });
});
