import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

const SLOT_ORDER = ['front', 'back', 'tags'];

function sortedPhotos(photos) {
  return [...photos].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot ?? '') - SLOT_ORDER.indexOf(b.slot ?? ''),
  );
}

function DetailRow({ label, value, valueClass = 'text-gray-100' }) {
  return (
    <div className="py-3 flex items-start justify-between gap-4 border-b border-gray-800/60 last:border-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider flex-shrink-0">{label}</dt>
      <dd className={`text-sm font-semibold text-right ${valueClass}`}>{value}</dd>
    </div>
  );
}

export default function ShirtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shirt, setShirt] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: shirt }, { data: history }] = await Promise.all([
        supabase.from('shirts').select('*').eq('id', id).single(),
        supabase.from('price_history').select('*').eq('shirt_id', id).order('recorded_at', { ascending: false }),
      ]);
      setShirt(shirt);
      setHistory(history ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this shirt? This cannot be undone.')) return;
    setDeleting(true);
    await supabase.from('shirts').delete().eq('id', id);
    navigate('/collection');
  }

  const fmt = (n) =>
    n != null
      ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
      </div>
    );
  }
  if (!shirt) return <p className="text-red-400 text-sm">Shirt not found.</p>;

  const photos = sortedPhotos(shirt.photos ?? []);
  const gain = shirt.current_value != null && shirt.purchase_price != null
    ? shirt.current_value - shirt.purchase_price
    : null;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link to="/collection" className="text-gray-500 hover:text-amber-400 transition-colors">
          Collection
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">{shirt.brand}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* ── Photo column ── */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-900 border border-gray-800/60 relative">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIdx].url}
                  alt={`${shirt.brand} – ${photos[photoIdx].slot ?? 'photo'}`}
                  className="w-full h-full object-cover"
                />
                {photos[photoIdx].slot && (
                  <span className="absolute bottom-3 left-3 capitalize text-xs font-semibold text-gray-200 bg-gray-950/70 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    {photos[photoIdx].slot}
                  </span>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <span className="text-7xl opacity-10 select-none">👕</span>
                <span className="text-sm text-gray-600">No photos yet</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2.5">
              {photos.map((p, i) => (
                <button
                  key={p.slot ?? i}
                  onClick={() => setPhotoIdx(i)}
                  className="flex flex-col items-center gap-1.5 group flex-1"
                >
                  <div className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                    i === photoIdx
                      ? 'border-amber-400 shadow-glow-sm'
                      : 'border-gray-800 group-hover:border-gray-600'
                  }`}>
                    <img src={p.url} alt={p.slot ?? ''} className="w-full h-full object-cover" />
                  </div>
                  {p.slot && (
                    <span className="text-[10px] text-gray-600 capitalize">{p.slot}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details column ── */}
        <div className="space-y-5">
          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-50 tracking-tight">{shirt.brand}</h1>
              <p className="text-gray-500 capitalize mt-1 text-sm">{shirt.style?.replace('_', ' ')}</p>
            </div>
            <ConditionBadge condition={shirt.condition} />
          </div>

          {/* Value highlight */}
          {shirt.current_value != null && (
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-0.5">Est. Value</p>
                <p className="text-2xl font-bold text-amber-400 tabular-nums">{fmt(shirt.current_value)}</p>
              </div>
              {gain != null && (
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-0.5">Gain / Loss</p>
                  <p className={`text-lg font-bold tabular-nums ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Details list */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800/60 px-5">
            <dl>
              <DetailRow label="Era / Year" value={[shirt.era, shirt.year].filter(Boolean).join(' · ') || '—'} />
              <DetailRow label="Size" value={shirt.size ?? '—'} />
              <DetailRow label="Purchase Price" value={fmt(shirt.purchase_price)} />
              <DetailRow label="Purchase Date" value={shirt.purchase_date ?? '—'} />
            </dl>
          </div>

          {/* Notes */}
          {(shirt.valuation_notes || shirt.notes) && (
            <div className="space-y-3">
              {shirt.valuation_notes && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800/60 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Valuation Notes</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{shirt.valuation_notes}</p>
                </div>
              )}
              {shirt.notes && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800/60 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{shirt.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link
              to={`/shirts/${id}/edit`}
              className="flex-1 text-center px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 text-sm font-semibold rounded-xl transition-all duration-150 shadow-glow-sm hover:shadow-glow"
            >
              Edit Shirt
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2.5 border border-gray-700 text-gray-500 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Price History */}
      <section className="bg-gray-900 rounded-2xl border border-gray-800/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60">
          <h2 className="font-semibold text-gray-100">Price History</h2>
          <Link to="/price-history" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
            View all →
          </Link>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600 px-6 py-8 text-center">No price history recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-800/40">
                {['Date', 'Price', 'Source', 'Notes'].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap tabular-nums">
                    {new Date(h.recorded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-amber-400 tabular-nums">{fmt(h.price)}</td>
                  <td className="px-6 py-3.5 text-gray-400">{h.source ?? '—'}</td>
                  <td className="px-6 py-3.5 text-gray-600">{h.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
