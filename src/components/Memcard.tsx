import { useEffect, useState } from 'react';
import { SvgXml } from 'react-native-svg';
import { View, useWindowDimensions } from 'react-native';

import { useInView } from './Rise';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { CARD_HEIGHT, CARD_WIDTH, memcardSvg } from '@/lib/memcardSvg';
import { RADIUS } from '@/styles/theme';

/** One step per month, and a beat for the stamp. */
const STEPS = 12;
const STEP_MS = 110;

/**
 * The card on screen.
 *
 * Same drawing as the image that gets shared — one SVG, rendered here
 * and rasterised there — so what someone posts is exactly what they
 * were looking at.
 *
 * With `assemble`, the card builds itself when it is first seen: months
 * land left to right, each game's name writing itself in as its block
 * arrives, the ROLL CREDITS stamp last — the year happening in a
 * second and a half rather than a year arriving as a fact. The steps
 * re-render the SVG string, which sounds expensive and is thirteen
 * calls to a template literal.
 */
export function Memcard({
  card,
  maxWidth,
  assemble = false,
  progress,
}: {
  card: MemcardModel;
  maxWidth?: number;
  /** Build the card in front of the reader when it enters the viewport. */
  assemble?: boolean;
  /**
   * Externally driven build state, 0..1. MemcardBuild flies covers in
   * and advances this as each one lands, so the block appears at the
   * instant its cover reaches the slot. Overrides `assemble`.
   */
  progress?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(maxWidth ?? CARD_WIDTH, windowWidth - 32, CARD_WIDTH);
  const height = (width / CARD_WIDTH) * CARD_HEIGHT;

  const reduced = useReducedMotion();
  const [ref, seen] = useInView();
  const building = assemble && !reduced;
  const [step, setStep] = useState(building ? 0 : STEPS);

  useEffect(() => {
    if (!building || !seen) return;
    // A short breath after the card lands, so the build is watched
    // rather than half-missed during its own entrance.
    const timer = setInterval(() => {
      setStep((current) => {
        if (current >= STEPS) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [building, seen]);

  return (
    <View
      ref={ref}
      style={{ width, height, borderRadius: RADIUS.md, overflow: 'hidden' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${card.year}: ${card.headline}`}
    >
      <SvgXml
        xml={memcardSvg(card, { progress: progress ?? step / STEPS })}
        width={width}
        height={height}
      />
    </View>
  );
}
