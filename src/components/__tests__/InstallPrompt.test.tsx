import { act, fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { InstallPrompt } from '../InstallPrompt';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
let restoreOS: () => void;
let installEvents: EventTarget;

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';

function browser(userAgent: string) {
  installEvents = new EventTarget();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: installEvents.addEventListener.bind(installEvents),
      removeEventListener:
        installEvents.removeEventListener.bind(installEvents),
      matchMedia: () => ({ matches: false }),
      navigator: { userAgent },
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent },
  });
}

beforeAll(() => {
  store = useFakeStorage();
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  restoreOS = () =>
    Object.defineProperty(Platform, 'OS', {
      value: previous,
      configurable: true,
    });
});
afterAll(() => restoreOS());
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  browser(CHROME_UA);
});

const offerInstall = async () =>
  act(async () => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: 'accepted' as const });
    installEvents.dispatchEvent(event);
  });

/**
 * The service worker and manifest have been there for weeks and nothing
 * ever suggested using them. Offered once, and remembered.
 */
describe('the install invitation', () => {
  it('says nothing until the browser offers', async () => {
    await renderApp(<InstallPrompt />);
    expect(screen.queryByText(/Install Sidequest/)).toBeNull();
  });

  it('invites you when the browser can install', async () => {
    await renderApp(<InstallPrompt />);
    await offerInstall();
    expect(screen.getByText(/Install Sidequest/)).toBeTruthy();
    expect(screen.getByText('Install')).toBeTruthy();
  });

  it('tells iOS the truth, since it has no prompt to offer', async () => {
    browser(IOS_UA);
    await renderApp(<InstallPrompt />);
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    // No button, because there is no button that would work.
    expect(screen.queryByText('Install')).toBeNull();
  });

  it('does not ask twice', async () => {
    browser(IOS_UA);
    const { unmount } = await renderApp(<InstallPrompt />);
    await fireEvent.press(screen.getByLabelText('Not now'));
    await unmount();
    await renderApp(<InstallPrompt />);
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
  });
});
