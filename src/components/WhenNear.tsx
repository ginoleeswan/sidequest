import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

/**
 * Holds a section's place until it is nearly on screen, then renders it.
 *
 * The home page mounts nine shelves. Only the first one or two are
 * anywhere near the fold, but every tile below still mounts, and the
 * browser starts fetching artwork for anything within its lazy-loading
 * margin — measured at 28 image requests for 7 visible covers. Those
 * requests compete with the ones someone is actually looking at.
 *
 * The placeholder is the section's own skeleton, so the space reserved
 * is the space the content will take and nothing moves when it swaps.
 * That is the whole trick: deferring work is only free if it does not
 * cost layout shift.
 *
 * Native renders immediately — FlatList already virtualises there, and
 * IntersectionObserver is a web API.
 */

/** Start a screen ahead, so content is ready before it is reached. */
const MARGIN = '100% 0px';

interface Props {
  /** Occupies the exact space the children will. */
  placeholder: React.ReactNode;
  children: React.ReactNode;
}

export function WhenNear({ placeholder, children }: Props) {
  const [near, setNear] = useState(Platform.OS !== 'web');
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (near) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      // No observer to lean on: show everything rather than nothing.
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  return <View ref={ref}>{near ? children : placeholder}</View>;
}
