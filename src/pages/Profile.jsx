import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STYLE_LABELS = {
  band_tee: 'Band Tees',
  sports:   'Sports',
  workwear: 'Workwear',
  souvenir: 'Souvenir',
  other:    'Other',
};

const fmt = (n) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function StatCell({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center gap-1 p-4">
      <span className={`text-xl font-bold tabular-nums ${accent ? 'text-amber-400' : 'text-gray-100'}`}>
        {value}
      </span>
      <span className="text-[11px] text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase
      .from('shirts')
      .select('current_value, purchase_price, style')
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        const totalValue = data.reduce((s, r) => s + (r.current_value ?? 0), 0);
        const totalCost  = data.reduce((s, r) => s + (r.purchase_price ?? 0), 0);
        const gain       = totalValue - totalCost;
        const gainPct    = totalCost > 0 ? (gain / totalCost) * 100 : null;

        const byStyle = {};
        for (const r of data) {
          byStyle[r.style] = (byStyle[r.style] ?? 0) + 1;
        }

        setStats({ count: data.length, totalValue, totalCost, gain, gainPct, byStyle });
        setLoading(false);
      });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="max-w-lg space-y-5">
      {/* Avatar + identity */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-amber-400 select-none">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-gray-100 font-semibold text-sm leading-snug break-all">{user?.email}</p>
          {memberSince && (
            <p className="text-gray-500 text-xs mt-1">Member since {memberSince}</p>
          )}
        </div>
      </section>

      {/* Collection summary */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/60">
          <h2 className="text-sm font-semibold text-gray-100">Collection</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-4 divide-x divide-gray-800/60 border-b border-gray-800/60">
              <StatCell label="Shirts"       value={stats.count}                 accent={false} />
              <StatCell label="Value"        value={fmt(stats.totalValue)}        accent />
              <StatCell label="Cost basis"   value={fmt(stats.totalCost)}         accent={false} />
              <StatCell
                label="All-time return"
                value={
                  stats.gainPct != null
                    ? `${stats.gainPct >= 0 ? '+' : ''}${stats.gainPct.toFixed(1)}%`
                    : '—'
                }
                accent={false}
              />
            </div>

            {/* Style breakdown */}
            {Object.keys(stats.byStyle).length > 0 && (
              <div className="px-5 py-4 space-y-2.5">
                {Object.entries(stats.byStyle)
                  .sort((a, b) => b[1] - a[1])
                  .map(([style, count]) => {
                    const pct = Math.round((count / stats.count) * 100);
                    return (
                      <div key={style} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{STYLE_LABELS[style] ?? style}</span>
                          <span className="text-gray-500 tabular-nums">{count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500/70 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-600 text-sm py-10">No shirts yet.</p>
        )}
      </section>

      {/* Account actions */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800/60">
          <h2 className="text-sm font-semibold text-gray-100">Account</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-600">
            Signed in as <span className="text-gray-400">{user?.email}</span>
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/40 text-red-400 hover:text-red-300 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
          >
            {signingOut ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing out…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
