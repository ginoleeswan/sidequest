import { useEffect, useRef } from 'react';

import { useToast } from './Toast';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';

/**
 * Says so when the device would not keep the data, or would not give it
 * back.
 *
 * There is no account and no server, so the library on this device is
 * the only copy. A failed save that the UI hides looks exactly like a
 * successful one until the data is gone — the user carries on adding
 * games believing they are kept.
 *
 * A failed READ is the quieter version of the same thing and is worse,
 * because there is nothing to notice: a library that will not parse
 * renders as an empty shelf, and an empty shelf is a plausible thing to
 * have. It is announced first for that reason — a reader looking at
 * what they think is a lost backlog should be told it is not lost
 * before anything else competes for the line.
 *
 * Lives here rather than in the providers because ToastProvider sits
 * inside them; this component is the join, and it stays silent unless
 * something actually failed.
 */
export function SaveErrorNotice() {
  const toast = useToast();
  const { saveError: libraryError, loadError: libraryLoadError } = useLibrary();
  const { saveError: durationsError } = useDurations();
  const message = libraryLoadError ?? libraryError ?? durationsError;

  // Only announce a change, so one full disk is not reported on every
  // keystroke that follows it.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (!message || message === announced.current) {
      if (!message) announced.current = null;
      return;
    }
    announced.current = message;
    toast(message, 'alert-circle');
  }, [message, toast]);

  return null;
}
