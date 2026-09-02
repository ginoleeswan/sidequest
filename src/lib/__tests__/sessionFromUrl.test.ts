import { sessionFromUrl } from '../supabase';

/**
 * The link a phone is opened with, in the shapes Supabase sends: tokens
 * in the fragment for the implicit flow, a code in the query for PKCE.
 */
describe('reading a session out of a sign-in link', () => {
  it('takes the tokens from the fragment', () => {
    expect(
      sessionFromUrl(
        'sidequest://you#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer'
      )
    ).toEqual({ access_token: 'abc', refresh_token: 'def' });
  });

  it('takes a PKCE code from the query', () => {
    expect(sessionFromUrl('sidequest://you?code=xyz')).toEqual({ code: 'xyz' });
  });

  it('ignores a link carrying neither', () => {
    expect(sessionFromUrl('sidequest://you')).toBeNull();
    expect(
      sessionFromUrl('sidequest://you#error_description=expired')
    ).toBeNull();
    expect(sessionFromUrl(null)).toBeNull();
  });
});
