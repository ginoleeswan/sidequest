import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Reveal } from '../Reveal';

const Bones = () => <Text>bones</Text>;
const Content = () => <Text>content</Text>;

/**
 * Reveal decides what occupies the page while data is in flight, and it
 * has a subtlety worth pinning down: while loading, the bones must sit in
 * normal flow rather than as an overlay. A document shorter than the
 * viewport leaves iOS Safari's translucent toolbar blurring over bare
 * canvas, which reads as a slab covering the bottom of the screen.
 */
describe('Reveal', () => {
  it('shows only the bones while pending', async () => {
    await render(
      <Reveal pending skeleton={<Bones />}>
        <Content />
      </Reveal>
    );
    expect(screen.getByText('bones')).toBeTruthy();
    expect(screen.queryByText('content')).toBeNull();
  });

  it('shows content with no theatre when it was ready immediately', async () => {
    await render(
      <Reveal pending={false} skeleton={<Bones />}>
        <Content />
      </Reveal>
    );
    expect(screen.getByText('content')).toBeTruthy();
    // A warm cache should not flash bones at all.
    expect(screen.queryByText('bones')).toBeNull();
  });

  it('cross-fades, keeping both on screen for the transition', async () => {
    const view = await render(
      <Reveal pending skeleton={<Bones />}>
        <Content />
      </Reveal>
    );
    await act(async () =>
      view.rerender(
        <Reveal pending={false} skeleton={<Bones />}>
          <Content />
        </Reveal>
      )
    );
    // Content takes the flow; bones linger only as the fading overlay.
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('returns to bones if it goes pending again', async () => {
    const view = await render(
      <Reveal pending={false} skeleton={<Bones />}>
        <Content />
      </Reveal>
    );
    await act(async () =>
      view.rerender(
        <Reveal pending skeleton={<Bones />}>
          <Content />
        </Reveal>
      )
    );
    expect(screen.getByText('bones')).toBeTruthy();
    expect(screen.queryByText('content')).toBeNull();
  });
});
