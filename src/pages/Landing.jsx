import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from '../components/Logo';

function CameraIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  );
}

function FeatureCard({ Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-gray-800/40 bg-gray-900/30 p-6 flex flex-col gap-3 text-left">
      <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Icon />
      </div>
      <div>
        <p className="font-semibold text-gray-100 text-sm mb-1.5">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { session } = useAuth();

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 relative z-10">
        <div className="flex items-center gap-2.5 font-bold text-base tracking-tight">
          <TagIcon size={26} />
          <span className="text-gray-100">Tag Charting</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-gray-100 transition-colors font-medium"
          >
            Log in
          </Link>
          <Link
            to="/login"
            state={{ mode: 'signup' }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 text-sm font-bold rounded-xl transition-all duration-150 shadow-glow-sm"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12 sm:py-20 relative z-10">
        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Now in beta
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold text-gray-50 tracking-tight leading-tight max-w-2xl mb-5">
          Your vintage collection,<br />
          <span className="text-amber-400">tracked and valued.</span>
        </h1>

        <p className="text-gray-500 text-base sm:text-lg max-w-md leading-relaxed mb-10">
          Catalog your vintage tees, get live eBay comps, and watch your portfolio grow — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-20">
          <Link
            to="/login"
            state={{ mode: 'signup' }}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold rounded-2xl transition-all duration-150 text-sm shadow-glow hover:shadow-glow"
          >
            Start tracking free
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 text-gray-400 hover:text-gray-100 border border-gray-800 hover:border-gray-600 font-medium rounded-2xl transition-all duration-150 text-sm"
          >
            Sign in
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          <FeatureCard
            Icon={CameraIcon}
            title="AI Photo Recognition"
            desc="Snap a photo and let AI identify the brand, era, and style of your vintage piece instantly."
          />
          <FeatureCard
            Icon={MoneyIcon}
            title="Live eBay Pricing"
            desc="Get real-time comparable sales from eBay to know exactly what your shirts are worth today."
          />
          <FeatureCard
            Icon={ChartIcon}
            title="Portfolio Tracking"
            desc="Watch your collection's total value over time with beautiful charts and gain/loss tracking."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center relative z-10">
        <p className="text-xs text-gray-700">© 2025 Tag Charting. All rights reserved.</p>
      </footer>
    </div>
  );
}
