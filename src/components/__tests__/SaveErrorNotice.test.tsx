import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SaveErrorNotice } from '../SaveErrorNotice';
import { ToastProvider } from '../Toast';
import * as durations from '@/lib/durations';
import * as library from '@/lib/library';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mount() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ToastProvider>
        <SaveErrorNotice />
        <Text>app</Text>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const stubStores = (
  libraryError: string | null,
  durationsError: string | null = null
) => {
  jest
    .spyOn(library, 'useLibrary')
    .mockReturnValue({ saveError: libraryError } as ReturnType<
      typeof library.useLibrary
    >);
  jest
    .spyOn(durations, 'useDurations')
    .mockReturnValue({ saveError: durationsError } as ReturnType<
      typeof durations.useDurations
    >);
};

afterEach(() => jest.restoreAllMocks());

describe('SaveErrorNotice', () => {
  it('stays silent while writes are landing', async () => {
    stubStores(null);
    await mount();
    expect(screen.queryByText(/save/i)).toBeNull();
  });

  it('speaks up when the library fails to save', async () => {
    stubStores("This device's storage is full — that change wasn't saved");
    await mount();
    expect(screen.getByText(/storage is full/)).toBeTruthy();
  });

  it('speaks up for durations too', async () => {
    stubStores(null, "Couldn't save to this device — that change wasn't saved");
    await mount();
    expect(screen.getByText(/Couldn't save/)).toBeTruthy();
  });

  /**
   * A full disk fails on every keystroke that follows it. Announcing each
   * one would bury the app under identical toasts.
   */
  it('announces a change, not every render', async () => {
    stubStores('disk full');
    const view = await mount();
    await act(async () => view.rerender(<Text>ignored</Text>));
    stubStores('disk full');
    await act(async () => {
      view.rerender(
        <SafeAreaProvider initialMetrics={METRICS}>
          <ToastProvider>
            <SaveErrorNotice />
          </ToastProvider>
        </SafeAreaProvider>
      );
    });
    expect(screen.queryAllByText('disk full').length).toBeLessThanOrEqual(1);
  });

  it('renders nothing of its own', async () => {
    stubStores(null);
    const view = await mount();
    expect(view.toJSON()).toBeTruthy();
    expect(screen.getByText('app')).toBeTruthy();
  });
});
