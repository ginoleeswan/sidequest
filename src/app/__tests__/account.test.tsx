import { screen } from '@testing-library/react-native';

import AccountScreen from '../account';
import { renderApp, useFakeStorage } from '@/test-utils';

beforeAll(() => {
  useFakeStorage();
});

/**
 * Signing in lives on a route rather than inside a disclosure on You:
 * it needs a URL to link to and to return to, and room for the states
 * that come after a magic link.
 *
 * Tests run without Supabase configuration — the same state a build
 * made without those keys is in — so what this can hold is the promise
 * that such a build says so plainly instead of drawing buttons that
 * cannot do anything.
 */
describe('the account screen', () => {
  it('says so when the build has no auth in it', async () => {
    await renderApp(<AccountScreen />);
    expect(screen.getByText('No account in this build')).toBeTruthy();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
  });
});
