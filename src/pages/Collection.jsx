import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

const STYLES = ['band_tee', 'sports', 'workwear', 'souvenir', 'other'];
const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const SORTS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'brand:asc',       label: 'Brand A–Z' },
  { value: 'current_value:desc', label: 'Highest value' },
  { value: 'purchase_price:desc', label: 'Highest cost' },
];

function ShirtCard({ shirt }) {
  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const photo = shirt.photos?.[0];

  return (
    <Link
      to={`/shirts/${shirt.id}`}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {photo ? (
          <img src={photo.url} alt={shirt.brand} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">&#128085;</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-snug">{shirt.brand}</h3>
          <ConditionBadge condition={shirt.condition} />
        </div>
        <p className="text-xs text-gray-400 capitalize">{shirt.style?.replace('_', ' ')} {shirt.era ? `· ${shirt.era}` : ''}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400">{shirt.size ?? '—'}</span>
          <span className="text-sm font-bold text-amber-600">{shirt.current_value ? fmt(shirt.current_value) : 'Not valued'}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Collection() {
  const [shirts, setShirts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [sort, setSort] = useState('created_at:desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from('shirts').select('id, brand, era, style, size, condition, current_value, photos, created_at, purchase_price');

      if (styleFilter) q = q.eq('style', styleFilter);
      if (conditionFilter) q = q.eq('condition', conditionFilter);

      const [col, dir] = sort.split(':');
      q = q.order(col, { ascending: dir === 'asc' });

      const { data } = await q;
      let results = data ?? [];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter((r) => r.brand?.toLowerCase().includes(s));
      }

      setShirts(results);
      setLoading(false);
    }
    load();
  }, [search, styleFilter, conditionFilter, sort]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Collection</h1>
        <Link
          to="/shirts/new"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Add Shirt
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-48"
        />

        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All styles</option>
          {STYLES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ml-auto"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : shirts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">&#128085;</p>
          <p className="text-lg font-medium">No shirts found</p>
          <p className="text-sm mt-1">
            <Link to="/shirts/new" className="text-amber-600 hover:underline">Add your first shirt</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shirts.map((shirt) => <ShirtCard key={shirt.id} shirt={shirt} />)}
        </div>
      )}

      {!loading && shirts.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{shirts.length} shirt{shirts.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
