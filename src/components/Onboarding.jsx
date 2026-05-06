import { useState } from 'react';
import { TagIcon } from './Logo';

function CameraSparkleIcon() {
  return (
    <svg className="w-11 h-11 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
    </svg>
  );
}

function ChartValueIcon() {
  return (
    <svg className="w-11 h-11 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-5 4 3 4-7" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SLIDES = [
  {
    id: 'welcome',
    icon: <TagIcon size={48} />,
    title: 'Welcome to\nTag Charting',
    subtitle: 'Your vintage collection, tracked and valued.',
    body: 'The app built for serious vintage collectors. Every shirt catalogued. Every dollar tracked.',
  },
  {
    id: 'snap',
    icon: <CameraSparkleIcon />,
    title: 'Snap & Identify',
    subtitle: 'AI reads any shirt in seconds.',
    body: 'Point your camera at any shirt. Our AI identifies the brand, era, tour, and style — then pulls live eBay comps automatically.',
  },
  {
    id: 'track',
    icon: <ChartValueIcon />,
    title: 'Track Your Value',
    subtitle: 'Watch your portfolio grow.',
    body: 'Log comps, set valuations, and watch your collection chart build over time. Know exactly what every piece is worth.',
  },
];

export default function Onboarding({ onDone }) {
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const isLast = slide === SLIDES.length - 1;

  function handleTouchStart(e) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e) {
    if (touchStart == null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      if (delta > 0 && slide < SLIDES.length - 1) setSlide((s) => s + 1);
      if (delta < 0 && slide > 0) setSlide((s) => s - 1);
    }
    setTouchStart(null);
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-950 flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial-amber pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[280px] bg-amber-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* Skip */}
      <div className="relative flex justify-end px-6 pt-14">
        <button
          onClick={onDone}
          className="text-sm font-medium text-gray-600 hover:text-gray-400 active:text-gray-300 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slides viewport */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            transform: `translateX(-${slide * (100 / SLIDES.length)}%)`,
            width: `${SLIDES.length * 100}%`,
          }}
        >
          {SLIDES.map((s) => (
            <div
              key={s.id}
              className="flex flex-col items-center justify-center text-center px-10 gap-8"
              style={{ width: `${100 / SLIDES.length}%` }}
            >
              {/* Icon bubble */}
              <div className="w-[88px] h-[88px] rounded-[28px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-glow">
                {s.icon}
              </div>

              {/* Text */}
              <div className="space-y-2.5 max-w-xs">
                <h1 className="text-[26px] font-bold text-gray-50 tracking-tight leading-tight whitespace-pre-line">
                  {s.title}
                </h1>
                <p className="text-amber-400 font-semibold text-[13px] tracking-wide">
                  {s.subtitle}
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex flex-col items-center gap-6 px-6 pb-16">
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide
                  ? 'w-6 h-2 bg-amber-400'
                  : 'w-2 h-2 bg-gray-700 hover:bg-gray-600'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        {isLast ? (
          <button
            onClick={onDone}
            className="w-full max-w-xs py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold text-[15px] rounded-2xl transition-all shadow-glow"
          >
            Get Started
          </button>
        ) : (
          <button
            onClick={() => setSlide((s) => s + 1)}
            className="w-full max-w-xs py-4 bg-gray-800 hover:bg-gray-700 active:bg-gray-750 text-gray-100 font-semibold text-[15px] rounded-2xl transition-all border border-gray-700/60"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
