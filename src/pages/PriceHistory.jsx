import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PriceHistory() {
  const [rows, setRows] = useState([]);
  const [shirts, setShirts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Add price form state
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ shirt_id: '', price: '', source: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: history }, { data: shirts }] = await Promise.all([
        supabase
          .from('price_history')
          .select('*, shirts(id, brand, style)')
          .order('recorded_at', { ascending: false }),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price History</h1>
          <p className="text-gray-500 mt-1 text-sm">All recorded valuations across your collection</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {adding ? 'Cancel' : '+ Log Price'}
        </button>
      </div>

      {/* Add entry form */}
      {adding && (
        <form onSubmit={handleAddEntry} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Log New Price</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shirt <span className="text-red-400">*</span></label>
              <select
                required
                value={newEntry.shirt_id}
                onChange={(e) => setNewEntry((v) => ({ ...v, shirt_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select a shirt…</option>
                {shirts.map((s) => <option key={s.id} value={s.id}>{s.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) <span className="text-red-400">*</span></label>
              <input
                required type="number" step="0.01" min="0"
                value={newEntry.price}
                onChange={(e) => setNewEntry((v) => ({ ...v, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                value={newEntry.source}
                onChange={(e) => setNewEntry((v) => ({ ...v, source: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="eBay sold, Depop, estimate…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={newEntry.notes}
                onChange={(e) => setNewEntry((v) => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Optional context…"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All shirts</option>
          {shirts.map((s) => <option key={s.id} value={s.id}>{s.brand}</option>)}
        </select>
        {filter && (
          <button onClick={() => setFilter('')} className="text-sm text-amber-600 hover:underline">Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No price history yet</p>
          <p className="text-sm mt-1">Prices are logged automatically when you set a value on a shirt.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Shirt</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(h.recorded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    {h.shirts ? (
                      <Link to={`/shirts/${h.shirts.id}`} className="font-medium text-gray-900 hover:text-amber-600">
                        {h.shirts.brand}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-3 font-semibold text-amber-600">{fmt(h.price)}</td>
                  <td className="px-6 py-3 text-gray-500">{h.source ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-400">{h.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
