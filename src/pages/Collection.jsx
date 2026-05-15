import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConditionBadge from '../components/ConditionBadge';
import { TagIcon } from '../components/Logo';
import RefreshButton from '../components/RefreshButton';
import { useRegisterPullRefresh } from '../context/PullToRefreshContext';

// ─── Filter / sort config ─────────────────────────────────────────────────────

const ERAS = [
  { value: '',        label: 'All eras' },
  { value: '70s',     label: '70s' },
  { value: '80s',     label: '80s' },
  { value: '90s',     label: '90s' },
  { value: '00s',     label: '00s' },
  { value: 'unknown', label: 'Unknown' },
];

const STYLES = [
  { value: '',         label: 'All styles' },
  { value: 'band_tee', label: 'Band Tee' },
  { value: 'sports',   label: 'Sports' },
  { value: 'workwear', label: 'Workwear' },
  { value: 'souvenir', label: 'Souvenir' },
  { value: 'other',    label: 'Other' },
];

const CONDITIONS = [
  { value: '',          label: 'All conditions' },
  { value: 'Mint',      label: 'Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good',      label: 'Good' },
  { value: 'Fair',      label: 'Fair' },
  { value: 'Poor',      label: 'Poor' },
];

const SORTS = [
  { value: 'date_desc',  label: 'Recently Added' },
  { value: 'value_desc', label: 'Highest Value' },
  { value: 'value_asc',  label: 'Lowest Value' },
  { value: 'gain_desc',  label: 'Biggest Gain' },
  { value: 'brand_asc',  label: 'Brand A–Z' },
];

const DEFAULT_SORT = 'date_desc';

const selectCls = 'flex-none bg-gray-700 text-gray-300 rounded-xl border-0 px-3 py-2 font-condensed text-xs uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all appearance-none cursor-pointer';

// Tailwind arbitrary-variant styling for both range slider thumbs
const rangeCls = [
  'absolute w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none',
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto',
  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-950',
  '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing',
  '[&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto',
  '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-500',
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0F172A]',
  '[&::-moz-range-thumb]:cursor-grab',
  '[&::-moz-range-track]:bg-transparent',
].join(' ');

// ─── Image cache ──────────────────────────────────────────────────────────────
const loadedUrls = new Set();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)   return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function PriceTrend({ current, purchase }) {
  if (current == null || purchase == null || purchase === 0) return null;
  const cur = Number(current);
  const pur = Number(purchase);
  const pct = ((cur - pur) / pur) * 100;

  if (Math.abs(pct) < 0.5) {
    return <span className="font-condensed text-[10px] text-gray-600 font-medium tabular-nums">—</span>;
  }
  if (pct > 0) {
    return (
      <span className="flex items-center gap-0.5 font-condensed text-[10px] font-semibold text-emerald-400 tabular-nums">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        {pct.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 font-condensed text-[10px] font-semibold text-red-400 tabular-nums">
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Lazy image with smart placeholder ───────────────────────────────────────

function LazyShirtImage({ src, alt, imgClassName, style }) {
  const preloaded = !!src && loadedUrls.has(src);
  const [loaded, setLoaded] = useState(preloaded);
  const imgRef = useRef(null);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!loaded && img && img.complete && img.naturalWidth > 0) {
      if (src) loadedUrls.add(src);
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoad() {
    if (src) loadedUrls.add(src);
    setLoaded(true);
  }

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full ${imgClassName}`}
        style={style}
        onLoad={handleLoad}
      />
      {!preloaded && (
        <div
          className="absolute inset-0 bg-gray-800 animate-pulse pointer-events-none transition-opacity duration-500"
          style={{ opacity: loaded ? 0 : 1 }}
        />
      )}
    </>
  );
}

// ─── Card views ───────────────────────────────────────────────────────────────

function ShirtCard({ shirt }) {
  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const photo = shirt.photos?.find((p) => p.slot === 'front') ?? shirt.photos?.[0];
  const checkedLabel = timeAgo(shirt.price_last_checked);

  return (
    <Link
      to={`/shirts/${shirt.id}`}
      className="group block overflow-hidden bg-gray-800 rounded-2xl hover:ring-1 hover:ring-amber-500/50 transition-all duration-300"
    >
      <div className="aspect-square bg-gray-800 relative overflow-hidden">
        {photo ? (
          <LazyShirtImage
            src={photo.url}
            alt={shirt.brand}
            imgClassName="object-cover scale-[1.15] group-hover:scale-[1.22] transition-transform duration-500 ease-out"
            style={{ objectPosition: 'center 30%' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v2l3 3-3 3v8a2 2 0 002 2h14a2 2 0 002-2v-8l-3-3 3-3V5a2 2 0 00-2-2h-4m-4 0v18m0-18h4m-4 0H9" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-2.5 right-2.5">
          <ConditionBadge condition={shirt.condition} />
        </div>
      </div>

      <div className="px-3.5 py-3.5 space-y-1.5">
        <h3 className="font-condensed font-bold text-sm uppercase tracking-wider leading-snug line-clamp-1 text-gray-100 group-hover:text-amber-500 transition-colors duration-200">
          {shirt.brand}
        </h3>
        <p className="font-condensed text-[10px] uppercase tracking-wide text-gray-600">
          {shirt.style?.replace('_', ' ')}{shirt.era ? ` · ${shirt.era}` : ''}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="font-condensed text-xs text-gray-600">{shirt.size ?? ''}</span>
          <div className="flex items-center gap-1.5">
            <PriceTrend current={shirt.current_value} purchase={shirt.purchase_price} />
            <span className="font-condensed text-sm font-bold text-amber-500 tabular-nums">
              {shirt.current_value ? fmt(shirt.current_value) : ''}
            </span>
          </div>
        </div>
        {checkedLabel && (
          <p className="font-condensed text-[10px] uppercase tracking-wide text-gray-700 tabular-nums">Checked {checkedLabel}</p>
        )}
      </div>
    </Link>
  );
}

function WallTile({ shirt }) {
  const photo = shirt.photos?.find((p) => p.slot === 'front') ?? shirt.photos?.[0];
  const cur = shirt.current_value != null ? Number(shirt.current_value) : null;
  const pur = shirt.purchase_price != null ? Number(shirt.purchase_price) : null;
  const pct = cur != null && pur != null && pur > 0 ? ((cur - pur) / pur) * 100 : null;

  return (
    <Link to={`/shirts/${shirt.id}`} className="group block relative aspect-square overflow-hidden bg-gray-900">
      {photo ? (
        <LazyShirtImage
          src={photo.url}
          alt={shirt.brand}
          imgClassName="object-cover scale-[1.12] group-hover:scale-[1.18] transition-transform duration-500 ease-out"
          style={{ objectPosition: 'center 30%' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <svg className="w-10 h-10 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v2l3 3-3 3v8a2 2 0 002 2h14a2 2 0 002-2v-8l-3-3 3-3V5a2 2 0 00-2-2h-4m-4 0v18m0-18h4m-4 0H9" />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex flex-col justify-end p-2">
        <p className="font-condensed text-white text-[11px] font-bold uppercase tracking-wide leading-tight line-clamp-1">{shirt.brand}</p>
        {pct != null && Math.abs(pct) >= 0.5 && (
          <span className={`font-condensed text-[10px] font-bold tabular-nums ${pct > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct > 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ConditionBadge condition={shirt.condition} />
      </div>
    </Link>
  );
}

// ─── Toggle icons ─────────────────────────────────────────────────────────────

function GridIcon({ active }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="9" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MosaicIcon({ active }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 24 24">
      <rect x="2"  y="2"  width="6.5" height="6.5" rx="0.5" />
      <rect x="10" y="2"  width="4"   height="6.5" rx="0.5" />
      <rect x="15.5" y="2" width="6.5" height="6.5" rx="0.5" />
      <rect x="2"  y="10" width="4"   height="4"   rx="0.5" />
      <rect x="7.5" y="10" width="9"  height="4"   rx="0.5" />
      <rect x="18" y="10" width="4"   height="4"   rx="0.5" />
      <rect x="2"  y="15.5" width="6.5" height="6.5" rx="0.5" />
      <rect x="10" y="15.5" width="4"   height="6.5" rx="0.5" />
      <rect x="15.5" y="15.5" width="6.5" height="6.5" rx="0.5" />
    </svg>
  );
}

// ─── Dual-handle value range slider ──────────────────────────────────────────

function ValueRangeFilter({ min, max, globalMax, onMinChange, onMaxChange }) {
  if (globalMax === 0) return null;

  const minPct = (min / globalMax) * 100;
  const maxPct = (max / globalMax) * 100;
  const fmtVal = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  return (
    <div className="flex-none bg-gray-700 rounded-xl px-3 py-2" style={{ minWidth: '176px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-condensed text-[10px] uppercase tracking-wider text-gray-500 font-medium">Value</span>
        <span className="font-condensed text-[10px] text-amber-500/80 tabular-nums font-mono">
          {fmtVal(min)} – {fmtVal(max)}
        </span>
      </div>

      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-700 pointer-events-none" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-amber-500 pointer-events-none"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={globalMax}
          step={5}
          value={min}
          onChange={(e) => onMinChange(Math.min(Number(e.target.value), max - 5))}
          className={rangeCls}
          style={{ zIndex: min > globalMax * 0.9 ? 5 : 3 }}
        />
        <input
          type="range"
          min={0}
          max={globalMax}
          step={5}
          value={max}
          onChange={(e) => onMaxChange(Math.max(Number(e.target.value), min + 5))}
          className={rangeCls}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Collection() {
  const [shirts, setShirts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [view, setView]           = useState('grid');

  const [search, setSearch]               = useState('');
  const [eraFilter, setEraFilter]         = useState('');
  const [styleFilter, setStyleFilter]     = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [sort, setSort]                   = useState(DEFAULT_SORT);
  const [rangeMin, setRangeMin]           = useState(0);
  const [rangeMax, setRangeMax]           = useState(0);
  const [globalMax, setGlobalMax]         = useState(0);

  useEffect(() => {
    shirts.forEach((shirt) => {
      const photo = shirt.photos?.find((p) => p.slot === 'front') ?? shirt.photos?.[0];
      if (photo?.url) { const i = new Image(); i.src = photo.url; }
    });
  }, [shirts]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('shirts')
      .select('id, brand, era, style, size, condition, current_value, purchase_price, photos, created_at, price_last_checked')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('price_last_checked')) {
        const { data: fallback, error: fbErr } = await supabase
          .from('shirts')
          .select('id, brand, era, style, size, condition, current_value, purchase_price, photos, created_at')
          .order('created_at', { ascending: false });

        if (fbErr) { setLoadError(fbErr.message); setLoading(false); return; }

        const results = fallback ?? [];
        const max = Math.ceil(Math.max(0, ...results.map((s) => Number(s.current_value || 0))));
        setShirts(results);
        setGlobalMax(max);
        setRangeMax(max);
        setLoading(false);
        return;
      }
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const results = data ?? [];
    const max = Math.ceil(Math.max(0, ...results.map((s) => Number(s.current_value || 0))));
    setShirts(results);
    setGlobalMax(max);
    setRangeMax(max);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRegisterPullRefresh(load);

  const filteredShirts = useMemo(() => {
    let result = [...shirts];

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((r) => r.brand?.toLowerCase().includes(s));
    }

    if (eraFilter) {
      if (eraFilter === 'unknown') {
        result = result.filter((r) => !r.era);
      } else {
        result = result.filter((r) => r.era?.toLowerCase().includes(eraFilter));
      }
    }

    if (styleFilter) result = result.filter((r) => r.style === styleFilter);
    if (conditionFilter) result = result.filter((r) => r.condition === conditionFilter);

    if (globalMax > 0 && (rangeMin > 0 || rangeMax < globalMax)) {
      result = result.filter((r) => {
        const val = Number(r.current_value || 0);
        return val >= rangeMin && val <= rangeMax;
      });
    }

    switch (sort) {
      case 'value_desc':
        result.sort((a, b) => (Number(b.current_value) || 0) - (Number(a.current_value) || 0));
        break;
      case 'value_asc':
        result.sort((a, b) => (Number(a.current_value) || 0) - (Number(b.current_value) || 0));
        break;
      case 'gain_desc':
        result.sort((a, b) => {
          const gain = (r) => {
            const pur = Number(r.purchase_price || 0);
            return pur > 0 ? (Number(r.current_value || 0) - pur) / pur : -Infinity;
          };
          return gain(b) - gain(a);
        });
        break;
      case 'brand_asc':
        result.sort((a, b) => (a.brand ?? '').localeCompare(b.brand ?? ''));
        break;
      default:
        break;
    }

    return result;
  }, [shirts, search, eraFilter, styleFilter, conditionFilter, sort, rangeMin, rangeMax, globalMax]);

  const hasFilters = !!(
    search || eraFilter || styleFilter || conditionFilter ||
    sort !== DEFAULT_SORT ||
    rangeMin > 0 || (globalMax > 0 && rangeMax < globalMax)
  );

  function clearFilters() {
    setSearch('');
    setEraFilter('');
    setStyleFilter('');
    setConditionFilter('');
    setSort(DEFAULT_SORT);
    setRangeMin(0);
    setRangeMax(globalMax);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-gray-50 tracking-tight">My Collection</h1>
          {!loading && (
            <p className="font-condensed text-xs uppercase tracking-wider text-gray-500 mt-1">
              {hasFilters
                ? `Showing ${filteredShirts.length} of ${shirts.length} shirt${shirts.length !== 1 ? 's' : ''}`
                : `${shirts.length} shirt${shirts.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={load} loading={loading} />
          <div className="flex items-center gap-0 bg-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 transition-all ${view === 'grid' ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
              aria-label="Grid view"
            >
              <GridIcon active={view === 'grid'} />
            </button>
            <button
              onClick={() => setView('wall')}
              className={`p-1.5 transition-all ${view === 'wall' ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
              aria-label="Grail wall view"
            >
              <MosaicIcon active={view === 'wall'} />
            </button>
          </div>
          <Link
            to="/shirts/new"
            className="px-4 py-2 bg-amber-500 text-gray-950 font-condensed text-xs font-bold uppercase tracking-[0.12em] rounded-xl hover:bg-amber-400 transition-all duration-150 cursor-pointer"
          >
            + Add Shirt
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-2 min-w-max">
          {/* Search */}
          <input
            type="text"
            placeholder="Search brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-none w-40 bg-gray-700 rounded-xl border-0 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
          />

          <select value={eraFilter} onChange={(e) => setEraFilter(e.target.value)} className={selectCls}>
            {ERAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} className={selectCls}>
            {STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className={selectCls}>
            {CONDITIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
            {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <ValueRangeFilter
            min={rangeMin}
            max={rangeMax}
            globalMax={globalMax}
            onMinChange={setRangeMin}
            onMaxChange={setRangeMax}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex-none flex items-center gap-1.5 px-3 py-2 font-condensed text-xs font-semibold uppercase tracking-wider text-amber-500 bg-gray-700 rounded-xl hover:bg-amber-500/10 transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          Failed to load collection: {loadError}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-gray-800 border-t-amber-500 animate-spin" />
        </div>
      ) : filteredShirts.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 px-6">
          <div className="mb-5 opacity-30">
            <TagIcon size={52} />
          </div>
          {shirts.length === 0 ? (
            <>
              <p className="font-serif text-xl font-bold text-gray-50 mb-1.5">Your vault is empty — time to hunt</p>
              <p className="text-gray-600 text-sm mb-6">Every great collection starts with one shirt.</p>
              <Link
                to="/shirts/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-gray-950 font-condensed text-xs font-bold uppercase tracking-[0.15em] rounded-2xl hover:bg-amber-400 transition-all duration-150 cursor-pointer"
              >
                Add your first shirt
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium mb-4">No shirts match your filters</p>
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 bg-gray-700 text-amber-500 font-condensed text-xs font-semibold uppercase tracking-[0.15em] rounded-xl hover:bg-amber-500/10 transition-colors"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredShirts.map((shirt) => <ShirtCard key={shirt.id} shirt={shirt} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-px bg-gray-800 overflow-hidden">
          {filteredShirts.map((shirt) => <WallTile key={shirt.id} shirt={shirt} />)}
        </div>
      )}
    </div>
  );
}
