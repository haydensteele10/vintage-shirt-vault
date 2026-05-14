import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TagIcon } from '../components/Logo';

export default function Landing() {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b-2 border-gray-800">
        <div className="flex items-center gap-2.5">
          <TagIcon size={24} />
          <span className="font-condensed font-semibold text-sm uppercase tracking-[0.2em] text-gray-50">
            Tag Charting
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="font-condensed text-xs uppercase tracking-wider font-semibold text-gray-500 hover:text-gray-50 transition-colors duration-150 cursor-pointer"
          >
            Log in
          </Link>
          <Link
            to="/login"
            state={{ mode: 'signup' }}
            className="px-5 py-2 bg-orange-500 border-2 border-orange-500 text-white font-condensed font-bold text-xs uppercase tracking-[0.15em] hover:bg-orange-600 hover:border-orange-600 transition-all duration-150 cursor-pointer"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-16 sm:py-20">
        <div className="max-w-5xl">
          <h1 className="font-display text-[clamp(4rem,11vw,8.5rem)] leading-[0.88] tracking-tight text-gray-50 mb-8">
            YOUR<br />VAULT.
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-xs leading-relaxed mb-10 ml-1">
            Catalog your vintage tees, pull live eBay comps, and watch your portfolio grow.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3 ml-1">
            <Link
              to="/login"
              state={{ mode: 'signup' }}
              className="px-8 py-4 bg-orange-500 border-2 border-orange-500 text-white font-condensed font-bold text-sm uppercase tracking-[0.15em] hover:bg-orange-600 hover:border-orange-600 transition-all duration-150 cursor-pointer"
            >
              Start tracking free
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-gray-700 text-gray-400 font-condensed font-semibold text-sm uppercase tracking-[0.15em] hover:border-gray-400 hover:text-gray-50 transition-all duration-150 cursor-pointer"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature strip — thick border dividers, no cards */}
        <div className="mt-24 sm:mt-32 border-t-2 border-gray-800">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {[
              { num: '01', title: 'AI Recognition',  desc: 'Snap a photo — get instant brand, era, and style ID.' },
              { num: '02', title: 'Live eBay Comps', desc: 'Real-time pricing from active and sold eBay listings.' },
              { num: '03', title: 'Portfolio Value', desc: 'Track your gains and build a record of your collection.' },
            ].map((f) => (
              <div key={f.num} className="border-b-2 sm:border-b-0 sm:border-r-2 border-gray-800 last:border-0 px-6 py-8">
                <span className="font-condensed text-xs font-semibold text-amber-500 uppercase tracking-[0.2em] block mb-3">{f.num}</span>
                <p className="font-condensed font-bold text-sm uppercase tracking-wider text-gray-100 mb-2">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-5 px-6 sm:px-10 border-t-2 border-gray-800">
        <p className="font-condensed text-xs uppercase tracking-[0.2em] text-gray-700">© 2025 Tag Charting</p>
      </footer>
    </div>
  );
}
