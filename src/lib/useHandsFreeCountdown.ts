import { useEffect, useRef, useState } from 'react';

// Continue only after an uninterrupted period of visible, usable tracking.
// Leaving the frame or hiding the TV page cancels the current countdown.
export function useHandsFreeCountdown(eligible: boolean, onComplete: () => void, seconds = 3, resetKey = '') {
  const [remaining, setRemaining] = useState<number | null>(null);
  const complete = useRef(onComplete);
  useEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { clearInterval(timer); timer = undefined; setRemaining(null); };
    const start = () => {
      stop();
      if (!eligible || document.hidden) return;
      const deadline = performance.now() + seconds * 1000;
      setRemaining(seconds);
      timer = setInterval(() => {
        const next = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
        setRemaining(next);
        if (next === 0) { clearInterval(timer); timer = undefined; complete.current(); }
      }, 100);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', start); };
  }, [eligible, seconds, resetKey]);
  return remaining;
}
