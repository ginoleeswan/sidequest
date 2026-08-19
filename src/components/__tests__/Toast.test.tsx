import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider, useToast } from '../Toast';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Trigger({ message }: { message: string }) {
  const toast = useToast();
  return (
    <Pressable onPress={() => toast(message)}>
      <Text>fire</Text>
    </Pressable>
  );
}

const mount = (message = 'Saved') =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ToastProvider>
        <Trigger message={message} />
      </ToastProvider>
    </SafeAreaProvider>
  );

describe('ToastProvider', () => {
  it('shows nothing until something is announced', async () => {
    await mount();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('shows the message it is given', async () => {
    await mount('Marked as Playing');
    await act(async () => fireEvent.press(screen.getByText('fire')));
    expect(screen.getByText('Marked as Playing')).toBeTruthy();
  });

  it('replaces the previous message rather than stacking', async () => {
    await mount('first');
    await act(async () => fireEvent.press(screen.getByText('fire')));
    expect(screen.getAllByText('first')).toHaveLength(1);
    await act(async () => fireEvent.press(screen.getByText('fire')));
    expect(screen.getAllByText('first')).toHaveLength(1);
  });

  /**
   * The dismiss timer used to outlive the provider and fire against a
   * torn-down tree, which throws rather than doing nothing — the
   * animation it drives no longer exists. Unmounting must be silent.
   */
  it('does not fire its dismiss timer after unmounting', async () => {
    const view = await mount();
    await act(async () => fireEvent.press(screen.getByText('fire')));
    await expect(act(async () => view.unmount())).resolves.not.toThrow();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2400));
    });
  });

  it('is safe to call outside a provider', () => {
    // The default context is a no-op, so a stray toast cannot crash a screen.
    expect(() => render(<Trigger message="x" />)).not.toThrow();
  });
});
