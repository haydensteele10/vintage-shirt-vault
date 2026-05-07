import { useEffect, useState } from 'react';
import { TagIcon } from './Logo';

const SPLASH_KEY = 'tc_splash';

function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function SplashScreen() {
  const [phase, setPhase] = useState(() => {
    if (!isPWA() && sessionStorage.getItem(SPLASH_KEY)) return 'done';
    return 'hidden';
  });

  useEffect(() => {
    if (phase === 'done') return;
    const t0 = setTimeout(() => setPhase('icon'), 50);
    const t1 = setTimeout(() => setPhase('word'), 650);
    const t2 = setTimeout(() => setPhase('out'), 1650);
    const t3 = setTimeout(() => {
      setPhase('done');
      sessionStorage.setItem(SPLASH_KEY, '1');
    }, 2200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done') return null;

  const iconVisible  = phase !== 'hidden';
  const wordVisible  = phase === 'word' || phase === 'out';
  const containerOut = phase === 'out';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950 transition-opacity duration-500 ${
        containerOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-5">
        <div
          className={`transition-all duration-500 ${
            iconVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <TagIcon size={72} />
        </div>

        <p
          className={`text-xl font-bold text-gray-100 tracking-tight transition-all duration-500 ${
            wordVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          Tag Charting
        </p>
      </div>
    </div>
  );
}
