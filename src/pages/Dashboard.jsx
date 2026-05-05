import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
    </div>
  );
}

function StatCard({ label, value, sub, dot = 'bg-gray-600', valueColor = 'text-gray-50' }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6 hover:border-gray-700/80 transition-colors group">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-3xl font-bold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ count: 0, totalCost: 0, totalValue: 0 });
  const [recent, setRecent] = useState([]);
  const [topValue, setTopValue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: shirts }, { data: recent }, { data: top }] = await Promise.all([
        supabase.from('shirts').select('purchase_price, current_value'),
        supabase.from('shirts').select('id, brand, style, condition, current_value, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('shirts').select('id, brand, style, condition, current_value').order('current_value', { ascending: false }).limit(5),
      ]);

      if (shirts) {
        setStats({
          count: shirts.length,
          totalCost: shirts.reduce((s, r) => s + (r.purchase_price ?? 0), 0),
          totalValue: shirts.reduce((s, r) => s + (r.current_value ?? 0), 0),
        });
      }
      setRecent(recent ?? []);
      setTopValue(top ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gain = stats.totalValue - stats.totalCost;
  const gainPositive = gain >= 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Your collection at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Shirts"
          value={stats.count}
          dot="bg-amber-400"
        />
        <StatCard
          label="Total Cost"
          value={fmt(stats.totalCost)}
          dot="bg-gray-500"
          valueColor="text-gray-200"
        />
        <StatCard
          label="Est. Value"
          value={fmt(stats.totalValue)}
          dot="bg-amber-500"
          valueColor="text-amber-400"
        />
        <StatCard
          label="Unrealized Gain"
          value={fmt(gain)}
          dot={gainPositive ? 'bg-emerald-500' : 'bg-red-500'}
          valueColor={gainPositive ? 'text-emerald-400' : 'text-red-400'}
          sub={stats.totalCost > 0 ? `${((gain / stats.totalCost) * 100).toFixed(1)}% ROI` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent additions */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-100">Recent Additions</h2>
            <Link to="/collection" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No shirts yet.</p>
              <Link to="/shirts/new" className="text-amber-400 hover:text-amber-300 text-sm mt-1 inline-block transition-colors">
                Add your first shirt →
              </Link>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/shirts/${s.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-800/60 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-200 group-hover:text-amber-400 transition-colors text-sm truncate">{s.brand}</p>
                      <p className="text-xs text-gray-600 capitalize mt-0.5">{s.style?.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <ConditionBadge condition={s.condition} />
                      <span className="text-sm font-semibold text-amber-400 tabular-nums w-20 text-right">
                        {s.current_value ? fmt(s.current_value) : '—'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Most valuable */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-100">Most Valuable</h2>
            <Link to="/collection" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View all →
            </Link>
          </div>
          {topValue.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No valued shirts yet.</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {topValue.map((s, i) => (
                <li key={s.id}>
                  <Link
                    to={`/shirts/${s.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-800/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-gray-700 w-5 text-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-200 group-hover:text-amber-400 transition-colors text-sm truncate">{s.brand}</p>
                        <p className="text-xs text-gray-600 capitalize mt-0.5">{s.style?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-400 tabular-nums flex-shrink-0 ml-3">
                      {s.current_value ? fmt(s.current_value) : '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
