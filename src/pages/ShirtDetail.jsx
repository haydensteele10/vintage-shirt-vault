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

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!shirt) return <p className="text-red-500">Shirt not found.</p>;

  const photos = sortedPhotos(shirt.photos ?? []);
  const gain = shirt.current_value != null && shirt.purchase_price != null
    ? shirt.current_value - shirt.purchase_price
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 flex items-center gap-1">
        <Link to="/collection" className="hover:text-amber-600">My Collection</Link>
        <span>/</span>
        <span className="text-gray-700">{shirt.brand}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Photos */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 relative">
            {photos.length > 0 ? (
              <>
                <img
                  src={photos[photoIdx].url}
                  alt={`${shirt.brand} – ${photos[photoIdx].slot ?? 'photo'}`}
                  className="w-full h-full object-cover"
                />
                {photos[photoIdx].slot && (
                  <span className="absolute bottom-3 left-3 capitalize text-xs font-semibold text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    {photos[photoIdx].slot}
                  </span>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-200">
                <span className="text-7xl">&#128085;</span>
                <span className="text-sm text-gray-300">No photos yet</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-3">
              {photos.map((p, i) => (
                <button
                  key={p.slot ?? i}
                  onClick={() => setPhotoIdx(i)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === photoIdx ? 'border-amber-400' : 'border-transparent group-hover:border-gray-300'
                  }`}>
                    <img src={p.url} alt={p.slot ?? ''} className="w-full h-full object-cover" />
                  </div>
                  {p.slot && (
                    <span className="text-[10px] text-gray-400 capitalize">{p.slot}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{shirt.brand}</h1>
              <p className="text-gray-500 capitalize mt-1">{shirt.style?.replace('_', ' ')}</p>
            </div>
            <ConditionBadge condition={shirt.condition} />
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { label: 'Era / Year', value: [shirt.era, shirt.year].filter(Boolean).join(' · ') || '—' },
              { label: 'Size', value: shirt.size ?? '—' },
              { label: 'Purchase Price', value: fmt(shirt.purchase_price) },
              { label: 'Purchase Date', value: shirt.purchase_date ?? '—' },
              { label: 'Est. Current Value', value: fmt(shirt.current_value) },
              { label: 'Gain / Loss', value: gain != null ? `${gain >= 0 ? '+' : ''}${fmt(gain)}` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          {shirt.valuation_notes && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Valuation Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{shirt.valuation_notes}</p>
            </div>
          )}

          {shirt.notes && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{shirt.notes}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              to={`/shirts/${id}/edit`}
              className="flex-1 text-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Price History */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Price History</h2>
          <Link to="/price-history" className="text-sm text-amber-600 hover:underline">View all</Link>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No price history recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2">Date</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="py-2 text-gray-500">{new Date(h.recorded_at).toLocaleDateString()}</td>
                  <td className="py-2 font-semibold">{fmt(h.price)}</td>
                  <td className="py-2 text-gray-500">{h.source ?? '—'}</td>
                  <td className="py-2 text-gray-400">{h.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
