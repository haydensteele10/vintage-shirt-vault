import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import RefreshButton from '../components/RefreshButton';
import { useRegisterPullRefresh } from '../context/PullToRefreshContext';

const fmtUsd = (n) =>
  n != null
    ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

function Spinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-500 animate-spin" />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function Dashboard() {
  const [shirts, setShirts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem('privacyMode') === 'true',
  );

  function togglePrivacy() {
    setPrivacyMode((prev) => {
      localStorage.setItem('privacyMode', String(!prev));
      return !prev;
    });
  }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('shirts')
      .select('id, brand, style, current_value, purchase_price, photos')
      .eq('user_id', user.id)
      .order('current_value', { ascending: false });
    setShirts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRegisterPullRefresh(load);

  const totalValue = shirts.reduce((s, r) => s + (r.current_value ?? 0), 0);
  const totalCost = shirts.reduce((s, r) => s + (r.purchase_price ?? 0), 0);
  const unrealizedGain = totalValue - totalCost;
  const shirtCount = shirts.length;

  const brandCounts = {};
  shirts.forEach((s) => {
    if (s.brand) brandCounts[s.brand] = (brandCounts[s.brand] ?? 0) + 1;
  });
  const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const mostValuable = shirts.slice(0, 5);
  const shirtsWithPhotos = shirts.filter((s) => s.photos?.length > 0);

  if (loading) return <Spinner />;

  const MASK = '•••••';

  return (
    <div>

      {/* ── 1) TOP BANNER ─────────────────────────────────────────────────── */}
      <div
        className="-mx-4 sm:-mx-6 lg:-mx-8 flex flex-col items-center justify-center relative border-b border-gray-800"
        style={{ minHeight: '40vh', paddingTop: '3rem', paddingBottom: '3rem' }}
      >
        <div className="absolute top-4 right-4 sm:right-6 lg:right-8 flex items-center gap-3">
          <RefreshButton onRefresh={load} loading={loading} />
          <button
            onClick={togglePrivacy}
            className="text-gray-600 hover:text-gray-400 transition-colors duration-150 cursor-pointer"
            aria-label={privacyMode ? 'Show values' : 'Hide values'}
          >
            {privacyMode ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>

        <span
          className="font-display text-gray-50 text-center leading-none select-none px-4"
          style={{ fontSize: 'clamp(40px, 9vw, 72px)' }}
        >
          {privacyMode ? MASK : fmtUsd(totalValue)}
        </span>

        <p className="font-condensed text-xs uppercase tracking-[0.3em] text-gray-600 mt-4">
          Total Vault Value
        </p>
      </div>

      {/* ── 2) PORTFOLIO STRIP ────────────────────────────────────────────── */}
      {shirtsWithPhotos.length > 0 && (
        <div
          className="-mx-4 sm:-mx-6 lg:-mx-8 flex gap-2 overflow-x-auto border-b border-gray-800"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '16px' }}
        >
          {shirtsWithPhotos.map((s) => {
            const photo = s.photos.find((p) => p.slot === 'front') ?? s.photos[0];
            return (
              <Link
                key={s.id}
                to={`/shirts/${s.id}`}
                className="flex-shrink-0 cursor-pointer"
              >
                <img
                  src={photo.url}
                  alt={s.brand}
                  className="block object-cover bg-gray-800"
                  style={{ width: 120, height: 120 }}
                />
              </Link>
            );
          })}
        </div>
      )}

      {/* ── 3) MOST VALUABLE ──────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-end justify-between mb-5">
          <h2
            className="font-display text-gray-50 leading-none"
            style={{ fontSize: '32px' }}
          >
            Most Valuable
          </h2>
          <Link
            to="/collection"
            className="font-condensed text-xs font-semibold uppercase tracking-wider text-orange-500 hover:text-orange-400 transition-colors duration-150 cursor-pointer mb-0.5"
          >
            View all →
          </Link>
        </div>

        {mostValuable.length === 0 ? (
          <div className="py-10 border-t border-gray-800">
            <p className="text-gray-600 text-sm">No shirts yet.</p>
            <Link
              to="/shirts/new"
              className="font-condensed text-xs uppercase tracking-wider text-orange-500 hover:text-orange-400 mt-1 inline-block transition-colors duration-150 cursor-pointer"
            >
              Add your first shirt →
            </Link>
          </div>
        ) : (
          <ul>
            {mostValuable.map((s) => {
              const photo = s.photos?.find((p) => p.slot === 'front') ?? s.photos?.[0];
              return (
                <li key={s.id} className="border-t border-gray-800">
                  <Link
                    to={`/shirts/${s.id}`}
                    className="flex items-center gap-4 py-4 hover:bg-gray-800/20 transition-colors duration-150 cursor-pointer"
                  >
                    <div
                      className="flex-shrink-0 bg-gray-800 overflow-hidden"
                      style={{ width: 60, height: 60 }}
                    >
                      {photo && (
                        <img
                          src={photo.url}
                          alt={s.brand}
                          className="w-full h-full object-cover block"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-bold text-base text-gray-50 truncate">
                        {s.brand}
                      </p>
                      {s.style && (
                        <p className="font-condensed text-xs uppercase tracking-wider text-gray-600 mt-0.5">
                          {s.style.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                    <span className="font-condensed text-sm font-bold text-gray-100 tabular-nums flex-shrink-0">
                      {privacyMode ? MASK : fmtUsd(s.current_value)}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="border-t border-gray-800" />
          </ul>
        )}
      </div>

      {/* ── 4) STATS ROW ──────────────────────────────────────────────────── */}
      <div className="flex mt-12 mb-8 border-t border-gray-800 pt-8">

        <div className="flex-1 flex flex-col items-center gap-2 px-3">
          <span
            className="font-display text-gray-50 leading-none tabular-nums"
            style={{ fontSize: '36px' }}
          >
            {shirtCount}
          </span>
          <span className="font-condensed text-[10px] uppercase tracking-[0.25em] text-gray-600 text-center">
            Total Shirts
          </span>
        </div>

        <div className="w-px bg-gray-800 self-stretch" />

        <div className="flex-1 flex flex-col items-center gap-2 px-3">
          <span
            className={`font-condensed font-bold tabular-nums leading-none text-center ${unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            style={{ fontSize: 'clamp(14px, 3.5vw, 24px)' }}
          >
            {privacyMode
              ? MASK
              : `${unrealizedGain >= 0 ? '+' : ''}${fmtUsd(unrealizedGain)}`}
          </span>
          <span className="font-condensed text-[10px] uppercase tracking-[0.25em] text-gray-600 text-center">
            Unrealized Gain
          </span>
        </div>

        <div className="w-px bg-gray-800 self-stretch" />

        <div className="flex-1 flex flex-col items-center gap-2 px-3">
          <span
            className="font-display text-gray-50 leading-none truncate max-w-full text-center"
            style={{ fontSize: 'clamp(16px, 4vw, 32px)' }}
          >
            {topBrand}
          </span>
          <span className="font-condensed text-[10px] uppercase tracking-[0.25em] text-gray-600 text-center">
            Top Brand
          </span>
        </div>

      </div>
    </div>
  );
}
