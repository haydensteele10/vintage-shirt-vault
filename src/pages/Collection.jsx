import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';

const STYLES = ['band_tee', 'sports', 'workwear', 'souvenir', 'other'];
const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const SORTS = [
  { value: 'created_at:desc',      label: 'Newest first' },
  { value: 'brand:asc',            label: 'Brand A–Z' },
  { value: 'current_value:desc',   label: 'Highest value' },
  { value: 'purchase_price:desc',  label: 'Highest cost' },
];

const selectCls = 'bg-gray-800 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all appearance-none cursor-pointer';

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)    return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)     return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)    return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12)  return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function ShirtCard({ shirt }) {
  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const photo = shirt.photos?.find((p) => p.slot === 'front') ?? shirt.photos?.[0];
  const checkedLabel = timeAgo(shirt.price_last_checked);

  return (
    <Link
      to={`/shirts/${shirt.id}`}
      className="group block rounded-2xl overflow-hidden bg-gray-900 border border-gray-800/50 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300"
    >
      {/* Photo */}
      <div className="aspect-[3/4] bg-gray-800 relative overflow-hidden">
        {photo ? (
          <img
            src={photo.url}
            alt={shirt.brand}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-10 select-none">👕</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Condition badge */}
        <div className="absolute top-2.5 right-2.5">
          <ConditionBadge condition={shirt.condition} />
        </div>
      </div>

      {/* Info */}
      <div className="px-3.5 py-3.5 space-y-1.5">
        <h3 className="font-semibold text-gray-100 text-sm leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors duration-200">
          {shirt.brand}
        </h3>
        <p className="text-xs text-gray-500 capitalize">
          {shirt.style?.replace('_', ' ')}{shirt.era ? ` · ${shirt.era}` : ''}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-gray-600">{shirt.size ?? ''}</span>
          <span className="text-sm font-bold text-amber-400 tabular-nums">
            {shirt.current_value ? fmt(shirt.current_value) : ''}
          </span>
        </div>
        {checkedLabel && (
          <p className="text-[10px] text-gray-700 tabular-nums">Checked {checkedLabel}</p>
        )}
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
      let q = supabase
        .from('shirts')
        .select('id, brand, era, style, size, condition, current_value, photos, created_at, purchase_price, price_last_checked');

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-50 tracking-tight">My Collection</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {shirts.length} shirt{shirts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          to="/shirts/new"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 text-sm font-semibold rounded-xl transition-all duration-150 shadow-glow-sm hover:shadow-glow"
        >
          + Add Shirt
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-900/60 border border-gray-800/60 rounded-2xl">
        <input
          type="text"
          placeholder="Search by brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all w-44"
        />

        <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} className={selectCls}>
          <option value="">All styles</option>
          {STYLES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className={selectCls}>
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${selectCls} ml-auto`}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-400 animate-spin" />
        </div>
      ) : shirts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-20 select-none">👕</div>
          <p className="text-gray-400 font-medium">No shirts found</p>
          {!styleFilter && !conditionFilter && !search ? (
            <Link to="/shirts/new" className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block transition-colors">
              Add your first shirt →
            </Link>
          ) : (
            <button
              onClick={() => { setSearch(''); setStyleFilter(''); setConditionFilter(''); }}
              className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shirts.map((shirt) => <ShirtCard key={shirt.id} shirt={shirt} />)}
        </div>
      )}
    </div>
  );
}
