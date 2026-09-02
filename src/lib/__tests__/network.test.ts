import { onlineManager } from '@tanstack/react-query';

import { wireOnlineManager } from '../network';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * React Query learns the phone's connection from expo-network. The
 * runner's stub reports a healthy connection; the listener it hands
 * back is what the app subscribes with.
 */
describe('wiring the online manager', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('asks the platform for its network state and listens for changes', async () => {
    const Network = jest.requireMock('expo-network') as {
      getNetworkStateAsync: jest.Mock;
      addNetworkStateListener: jest.Mock;
    };
    Network.getNetworkStateAsync.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    const dispose = wireOnlineManager();
    // The manager only asks its listener once something subscribes.
    const unsubscribe = onlineManager.subscribe(() => {});
    await flush();
    await flush();
    expect(Network.getNetworkStateAsync).toHaveBeenCalled();
    expect(Network.addNetworkStateListener).toHaveBeenCalled();
    expect(onlineManager.isOnline()).toBe(false);

    const listener = Network.addNetworkStateListener.mock.calls.at(-1)[0] as (
      state: unknown
    ) => void;
    listener({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
    unsubscribe();
    dispose();
  });
});
