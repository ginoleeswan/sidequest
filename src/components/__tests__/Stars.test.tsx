import { render, screen } from '@testing-library/react-native';

import { Stars } from '../Stars';

/** Five stars and a word — the word comes from the most common vote. */
describe('the star rating', () => {
  it('names the verdict most people gave', async () => {
    await render(<Stars rating={4.42} ratingTop={5} />);
    expect(screen.getByText(/Great · 4\.4/)).toBeTruthy();
  });

  it('rounds the average to one decimal', async () => {
    await render(<Stars rating={3.06} ratingTop={3} />);
    expect(screen.getByText(/Okay · 3\.1/)).toBeTruthy();
  });

  it('says nothing rather than something wrong for an unknown verdict', async () => {
    await render(<Stars rating={0} ratingTop={0} />);
    expect(screen.getByText(/· 0\.0/)).toBeTruthy();
  });
});
