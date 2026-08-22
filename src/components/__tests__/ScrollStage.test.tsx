// src/components/__tests__/ScrollStage.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScrollStage } from '../ScrollStage';

// Jest runs as ios, so this is the unpinned fallback path — the one
// native and reduced-motion readers get.
describe('ScrollStage without pinning', () => {
  it('renders its children rather than an empty track', async () => {
    await render(
      <ScrollStage track={2.6}>{() => <Text>the showpiece</Text>}</ScrollStage>
    );
    expect(screen.getByText('the showpiece')).toBeTruthy();
  });

  it('hands children undefined rather than a finished value, so nothing waits for a scroll that will never come', async () => {
    let seen: unknown = 'not called';
    await render(
      <ScrollStage track={2.6}>
        {(progress) => {
          // undefined tells the child "there is no driver" — the same
          // signal MemcardBuild's own optional `progress` prop already
          // understands as "run your own clock". A finished `1` would
          // instead have the child believe the build already played out.
          seen = progress;
          return <Text>x</Text>;
        }}
      </ScrollStage>
    );
    expect(seen).toBeUndefined();
  });
});
