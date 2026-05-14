import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const inputCls = 'w-full bg-gray-800 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all';
const selectCls = 'w-full bg-gray-800 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all';

export default function PriceHistory() {
  const [rows, setRows] = useState([]);
  const [shirts, setShirts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ shirt_id: '', price: '', source: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: history }, { data: shirts }] = await Promise.all([
        supabase.from('price_history').select('*, shirts(id, brand, style)').order('recorded_at', { ascending: false }),
        supabase.from('shirts').select('id, brand').order('brand'),
      ]);
      setRows(history ?? []);
      setShirts(shirts ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAddEntry(e) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from('price_history')
      .insert({
        shirt_id: newEntry.shirt_id,
        price: parseFloat(newEntry.price),
        source: newEntry.source.trim() || null,
        notes: newEntry.notes.trim() || null,
      })
      .select('*, shirts(id, brand, style)')
      .single();

    if (!error && data) {
      setRows((prev) => [data, ...prev]);
      setNewEntry({ shirt_id: '', price: '', source: '', notes: '' });
      setAdding(false);
    }
    setSaving(false);
  }

  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filtered = filter ? rows.filter((r) => r.shirt_id === filter) : rows;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Price History</h1>
          <p className="text-gray-500 mt-1 text-sm">All recorded valuations across your collection</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-150 ${
            adding
              ? 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              : 'bg-orange-500 hover:bg-orange-400 text-white'
          }`}
        >
          {adding ? 'Cancel' : '+ Log Price'}
        </button>
      </div>

      {/* Add entry form */}
      {adding && (
        <form onSubmit={handleAddEntry} className="rounded-2xl border border-gray-800/20 p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-800/60">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Log New Price</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shirt <span className="text-amber-500">*</span>
              </label>
              <select required value={newEntry.shirt_id} onChange={(e) => setNewEntry((v) => ({ ...v, shirt_id: e.target.value }))} className={selectCls}>
                <option value="">Select a shirt…</option>
                {shirts.map((s) => <option key={s.id} value={s.id}>{s.brand}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price ($) <span className="text-amber-500">*</span>
              </label>
              <input
                required type="number" step="0.01" min="0"
                value={newEntry.price}
                onChange={(e) => setNewEntry((v) => ({ ...v, price: e.target.value }))}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Source</label>
              <input
                value={newEntry.source}
                onChange={(e) => setNewEntry((v) => ({ ...v, source: e.target.value }))}
                placeholder="eBay sold, Depop, estimate…"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</label>
              <input
                value={newEntry.notes}
                onChange={(e) => setNewEntry((v) => ({ ...v, notes: e.target.value }))}
                placeholder="Optional context…"
                className={inputCls}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-condensed font-bold text-xs uppercase tracking-wider transition-all duration-150 disabled:opacity-40 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </form>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 p-3 border border-gray-800/20 rounded-2xl">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
        >
          <option value="">All shirts</option>
          {shirts.map((s) => <option key={s.id} value={s.id}>{s.brand}</option>)}
        </select>
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Clear filter
          </button>
        )}
        {!loading && (
          <span className="ml-auto text-xs text-gray-600">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-gray-800/20">
          <p className="text-gray-400 font-medium">No price history yet</p>
          <p className="text-sm text-gray-600 mt-1">Prices are logged automatically when you set a value on a shirt.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="px-3 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">Date</th>
                <th className="px-3 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">Shirt</th>
                <th className="px-3 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">Price</th>
                <th className="hidden sm:table-cell px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">Source</th>
                <th className="hidden sm:table-cell px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-3 sm:px-6 py-3.5 text-gray-500 whitespace-nowrap tabular-nums text-xs sm:text-sm">
                    {new Date(h.recorded_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3.5 max-w-[120px] sm:max-w-none">
                    {h.shirts ? (
                      <Link to={`/shirts/${h.shirts.id}`} className="font-medium text-gray-200 hover:text-amber-400 transition-colors truncate block">
                        {h.shirts.brand}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-3 sm:px-6 py-3.5 font-semibold text-amber-400 tabular-nums text-xs sm:text-sm whitespace-nowrap">{fmt(h.price)}</td>
                  <td className="hidden sm:table-cell px-6 py-3.5 text-gray-500">{h.source ?? '—'}</td>
                  <td className="hidden sm:table-cell px-6 py-3.5 text-gray-600">{h.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
