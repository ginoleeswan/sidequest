import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SignInRows } from '../SignInRows';
import { ToastProvider } from '../Toast';
import { useAuth } from '@/lib/auth';

/**
 * The account controls, with the auth context faked at its own seam.
 * What matters here is what the buttons DO with the flows — busy state,
 * the cancelled-sheet silence, the email gate — not the flows
 * themselves, which authProvider.test covers.
 */

jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
}));

const mockedUseAuth = useAuth as jest.Mock;

const auth = (over: Record<string, unknown> = {}) => ({
  session: null,
  loading: false,
  available: true,
  signInWithApple: jest.fn(async () => undefined),
  signInWithGoogle: jest.fn(async () => undefined),
  signInWithEmail: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
  ...over,
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mount = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ToastProvider>
        <SignInRows />
      </ToastProvider>
    </SafeAreaProvider>
  );

describe('SignInRows', () => {
  it('renders nothing in a build with no auth configured', async () => {
    mockedUseAuth.mockReturnValue(auth({ available: false }));
    await mount();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
  });

  it('offers Apple only where Apple can honour it', async () => {
    mockedUseAuth.mockReturnValue(auth());
    await mount();
    // isAvailableAsync resolved true (mocked); the probe is async, so
    // the button arrives after the effect settles.
    await act(async () => {});
    expect(screen.getByLabelText('Continue with Apple')).toBeTruthy();
    expect(screen.getByLabelText('Continue with Google')).toBeTruthy();
  });

  it('a signed-in session shows sign-out and nothing else', async () => {
    mockedUseAuth.mockReturnValue(auth({ session: { user: { id: 'u1' } } }));
    await mount();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
  });

  it('a cancelled sheet stays silent; a real failure says why', async () => {
    const google = jest
      .fn()
      .mockRejectedValueOnce(new Error('The user canceled the sign in flow'))
      .mockRejectedValueOnce(new Error('network down'));
    mockedUseAuth.mockReturnValue(auth({ signInWithGoogle: google }));
    await mount();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue with Google'));
    });
    expect(screen.queryByText(/Could not sign in/)).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Continue with Google'));
    });
    expect(screen.getByText(/Could not sign in — network down/)).toBeTruthy();
  });

  it('the email arrow is inert until the text looks like an address', async () => {
    const emailFlow = jest.fn(async () => undefined);
    mockedUseAuth.mockReturnValue(auth({ signInWithEmail: emailFlow }));
    await mount();
    const send = screen.getByLabelText('Send sign-in link');
    await act(async () => {
      fireEvent.press(send);
    });
    expect(emailFlow).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText('Email address'),
        '  g@example.com '
      );
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Send sign-in link'));
    });
    // Trimmed before it is sent: a pasted address keeps its whitespace.
    expect(emailFlow).toHaveBeenCalledWith('g@example.com');
    expect(screen.getByText(/Check your email/)).toBeTruthy();
  });
});
