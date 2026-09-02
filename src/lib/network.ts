import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Tell React Query when the phone is offline.
 *
 * On the web it already knows: the default manager listens to the
 * window's online and offline events. On native it assumed "online"
 * forever, so a query started on the Underground went straight to a
 * failed fetch and a "couldn't reach the game database" error — and
 * nothing refetched when the signal came back. Wired to the platform's
 * network state, a query asked offline pauses instead of failing, the
 * page can say so, and everything on screen refetches on reconnect.
 *
 * Loaded lazily so the web bundle never carries the module, and every
 * failure is swallowed: a device that cannot report its network is a
 * device treated as online, which is the behaviour before this existed.
 */
export function wireOnlineManager(): () => void {
  if (Platform.OS === 'web') return () => {};

  let disposed = false;
  let subscription: { remove: () => void } | null = null;

  onlineManager.setEventListener((setOnline) => {
    import('expo-network')
      .then((Network) => {
        if (disposed) return;
        const reachable = (state: {
          isConnected?: boolean;
          isInternetReachable?: boolean;
        }) =>
          state.isConnected !== false && state.isInternetReachable !== false;
        Network.getNetworkStateAsync()
          .then((state) => setOnline(reachable(state)))
          .catch(() => {});
        subscription = Network.addNetworkStateListener((state) =>
          setOnline(reachable(state))
        );
      })
      .catch(() => {});
    return () => {
      disposed = true;
      subscription?.remove();
      subscription = null;
    };
  });

  return () => {
    disposed = true;
    subscription?.remove();
  };
}

/** Whether the app believes it can reach the network right now. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    // Pre-rendered HTML assumes a connection; the truth arrives on the
    // client's first commit.
    () => true
  );
}
