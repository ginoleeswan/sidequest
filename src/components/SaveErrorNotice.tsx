import { useEffect, useRef } from 'react';

import { useToast } from './Toast';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';

/**
 * Says so when a write to the device did not land.
 *
 * There is no account and no server, so the library on this device is
 * the only copy. A failed save that the UI hides looks exactly like a
 * successful one until the data is gone — the user carries on adding
 * games believing they are kept.
 *
 * Lives here rather than in the providers because ToastProvider sits
 * inside them; this component is the join, and it stays silent unless a
 * write actually fails.
 */
export function SaveErrorNotice() {
  const toast = useToast();
  const { saveError: libraryError } = useLibrary();
  const { saveError: durationsError } = useDurations();
  const message = libraryError ?? durationsError;

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
