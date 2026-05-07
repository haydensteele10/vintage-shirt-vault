// Renders a pull-to-refresh spinner fixed just below the navbar.
// phase: 'idle' | 'pulling' | 'refreshing'
// pullY: raw drag distance in px (used for opacity + rotation while pulling)
const THRESHOLD = 72;
const NAVBAR_H  = 60; // px — matches the sticky navbar height

export default function PullIndicator({ phase, pullY }) {
  if (phase === 'idle') return null;

  const progress   = Math.min(pullY / THRESHOLD, 1);
  const translateY = phase === 'refreshing' ? 48 : Math.min(pullY * 0.55, 48);
  const opacity    = phase === 'refreshing' ? 1 : progress;
  const rotation   = phase === 'pulling' ? Math.round(progress * 300) : 0;

  return (
    <div
      className="fixed left-0 right-0 z-[80] flex justify-center pointer-events-none"
      style={{ top: NAVBAR_H, transform: `translateY(${translateY}px)` }}
    >
      <div
        className="w-8 h-8 rounded-full bg-gray-900 border border-gray-700/60 shadow-xl flex items-center justify-center"
        style={{ opacity }}
      >
        <div
          className={`w-[15px] h-[15px] rounded-full border-2 border-gray-700 border-t-amber-400 ${
            phase === 'refreshing' ? 'animate-spin' : ''
          }`}
          style={phase === 'pulling' ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
      </div>
    </div>
  );
}
