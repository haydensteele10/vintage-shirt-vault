import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
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

  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your collection at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Shirts" value={stats.count} />
        <StatCard label="Total Cost" value={fmt(stats.totalCost)} />
        <StatCard label="Est. Value" value={fmt(stats.totalValue)} />
        <StatCard
          label="Unrealized Gain"
          value={fmt(gain)}
          sub={stats.totalCost > 0 ? `${((gain / stats.totalCost) * 100).toFixed(1)}% ROI` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent additions */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Additions</h2>
            <Link to="/collection" className="text-sm text-amber-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-gray-400 text-sm">No shirts yet. <Link to="/shirts/new" className="text-amber-600 hover:underline">Add one</Link></p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recent.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link to={`/shirts/${s.id}`} className="font-medium text-gray-900 hover:text-amber-600">{s.brand}</Link>
                    <p className="text-xs text-gray-400 capitalize">{s.style?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConditionBadge condition={s.condition} />
                    <span className="text-sm font-semibold text-gray-700">{s.current_value ? fmt(s.current_value) : '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top value */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Most Valuable</h2>
            <Link to="/collection" className="text-sm text-amber-600 hover:underline">View all</Link>
          </div>
          {topValue.length === 0 ? (
            <p className="text-gray-400 text-sm">No valued shirts yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {topValue.map((s, i) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-gray-300">#{i + 1}</span>
                    <div>
                      <Link to={`/shirts/${s.id}`} className="font-medium text-gray-900 hover:text-amber-600">{s.brand}</Link>
                      <p className="text-xs text-gray-400 capitalize">{s.style?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">{s.current_value ? fmt(s.current_value) : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
