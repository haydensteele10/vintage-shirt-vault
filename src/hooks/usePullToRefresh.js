import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72; // px of drag to trigger refresh

export function usePullToRefresh(onRefresh) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'pulling' | 'refreshing'
  const [pullY, setPullY] = useState(0);

  // Stable ref so the effect's event handlers always call the latest callback
  const callbackRef = useRef(onRefresh);
  useEffect(() => { callbackRef.current = onRefresh; }, [onRefresh]);

  const startYRef    = useRef(0);
  const activeRef    = useRef(false);
  const pullYRef     = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY > 5) return; // only at top
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
    }

    function onTouchMove(e) {
      if (!activeRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        activeRef.current = false;
        pullYRef.current = 0;
        setPhase('idle');
        setPullY(0);
        return;
      }
      // Block native browser pull-to-refresh
      if (window.scrollY === 0) e.preventDefault();
      const clamped = Math.min(delta, THRESHOLD * 1.6);
      pullYRef.current = clamped;
      setPullY(clamped);
      setPhase('pulling');
    }

    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      const captured = pullYRef.current;
      pullYRef.current = 0;
      setPullY(0);

      if (captured >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setPhase('refreshing');
        try {
          await callbackRef.current();
        } finally {
          refreshingRef.current = false;
          setPhase('idle');
        }
      } else {
        setPhase('idle');
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // empty — event handlers read callbackRef, not the callback directly

  return { phase, pullY };
}
