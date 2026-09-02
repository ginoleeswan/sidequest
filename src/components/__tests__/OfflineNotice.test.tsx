import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineNotice } from '../OfflineNotice';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

afterEach(() => onlineManager.setOnline(true));

/**
 * The one line the app says about the network, and only while it is
 * gone. Everything shown offline is real — the library is on the
 * device — so the notice explains, once, and leaves with the signal.
 */
describe('the offline notice', () => {
  it('says nothing while online', async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <OfflineNotice />
      </SafeAreaProvider>
    );
    expect(screen.queryByText(/Offline/)).toBeNull();
  });

  it('appears when the connection goes, and leaves when it returns', async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <OfflineNotice />
      </SafeAreaProvider>
    );
    await act(async () => onlineManager.setOnline(false));
    expect(
      screen.getByText(/Offline — showing what’s saved here/)
    ).toBeTruthy();
    await act(async () => onlineManager.setOnline(true));
    expect(screen.queryByText(/Offline/)).toBeNull();
  });
});
