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

  it('hands children a finished progress value, so nothing waits for a scroll that will never come', async () => {
    let seen = -1;
    await render(
      <ScrollStage track={2.6}>
        {(progress) => {
          // Reading the private current value is the only synchronous
          // way to assert what the child was given.
          seen = (
            progress as unknown as { __getValue(): number }
          ).__getValue();
          return <Text>x</Text>;
        }}
      </ScrollStage>
    );
    expect(seen).toBe(1);
  });
});
