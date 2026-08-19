import { render, screen } from '@testing-library/react-native';

import { RatingsBreakdown } from '../RatingsBreakdown';
import type { RatingBucket } from '@/api/types';

const buckets = [
  { id: 5, title: 'exceptional', count: 12926, percent: 62.5 },
  { id: 4, title: 'recommended', count: 5400, percent: 26.1 },
  { id: 1, title: 'skip', count: 300, percent: 1.4 },
] as RatingBucket[];

/** The community verdict, as bars — silent when nobody has voted. */
describe('the ratings breakdown', () => {
  it('stays out of the way when there are no ratings', async () => {
    await render(
      <RatingsBreakdown
        ratings={
          [
            { id: 5, title: 'exceptional', count: 0, percent: 0 },
          ] as RatingBucket[]
        }
      />
    );
    expect(screen.toJSON()).toBeNull();
  });

  it('labels each bucket in words, not slugs', async () => {
    await render(<RatingsBreakdown ratings={buckets} />);
    expect(screen.getByText('Exceptional')).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    expect(screen.queryByText('exceptional')).toBeNull();
  });

  it('abbreviates the counts and totals them', async () => {
    await render(<RatingsBreakdown ratings={buckets} />);
    expect(screen.getByText('12.9k')).toBeTruthy();
    expect(screen.getByText('18.6k player ratings')).toBeTruthy();
  });

  it('falls back to the raw title for a bucket it does not know', async () => {
    await render(
      <RatingsBreakdown
        ratings={
          [
            { id: 9, title: 'sublime', count: 4, percent: 100 },
          ] as RatingBucket[]
        }
      />
    );
    expect(screen.getByText('sublime')).toBeTruthy();
  });
});
