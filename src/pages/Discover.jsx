import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { discoverListings } from '../lib/ebay';
import { useSheet } from '../context/SheetContext';
import { TagIcon } from '../components/Logo';
import RefreshButton from '../components/RefreshButton';

// ─── Title parser (shared with Search page) ───────────────────────────────────

function parseTitleToFormFields(title, price) {
  const fields = {
    brand: '',
    era: '',
    year: '',
    style: 'band_tee',
    purchase_price: price != null ? String(price.toFixed(2)) : '',
    notes: `eBay listing: ${title}`,
  };

  const yearMatch = title.match(/\b(19[6-9]\d|200[0-9])\b/);
  if (yearMatch) {
    fields.year = yearMatch[1];
    const y = parseInt(yearMatch[1], 10);
    fields.era = `${Math.floor(y / 10) * 10}s`;
  }

  const eraMatch = title.match(/\b(60s|70s|80s|90s|2000s|00s)\b/i);
  if (eraMatch) fields.era = eraMatch[1].toLowerCase().replace('2000s', '00s');

  if (/nfl|nba|mlb|nascar|racing|football|basketball|baseball|hockey|sport/i.test(title)) {
    fields.style = 'sports';
  } else if (/harley|work|carhartt|union|trucker/i.test(title)) {
    fields.style = 'workwear';
  } else if (/souvenir|destination|vacation|tourist/i.test(title)) {
    fields.style = 'souvenir';
  }

  const brandMatch = title.match(
    /^([A-Za-z][A-Za-z\s'&./-]{1,40}?)(?:\s+(?:vintage|vtg|tee|t-shirt|shirt|tour|concert|\d{4}|'?[89]\d|single|deadstock))/i,
  );
  if (brandMatch) {
    fields.brand = brandMatch[1].trim().replace(/\s+/g, ' ');
  } else {
    fields.brand = title.split(/\s+/).slice(0, 3).join(' ');
  }

  return fields;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-40 sm:w-48 rounded-xl border border-gray-800/20 overflow-hidden">
      <div className="aspect-square bg-gray-800 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-800 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-800 rounded animate-pulse mt-1" />
        <div className="h-6 w-full bg-gray-800/60 rounded-lg animate-pulse mt-2" />
      </div>
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((i) => (
        <section key={i}>
          <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
            <div className="h-4 w-44 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-14 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-hidden px-4 sm:px-6">
            {[0, 1, 2, 3].map((j) => <SkeletonCard key={j} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({ listing }) {
  const [imgError, setImgError] = useState(false);
  const { openAddShirt } = useSheet();

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    openAddShirt({
      form:     parseTitleToFormFields(listing.title, listing.price),
      imageUrl: listing.image || null,
    });
  }

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-none w-40 sm:w-48 rounded-xl border border-gray-800/20 overflow-hidden hover:border-amber-500/40 active:border-amber-500/60 transition-colors group"
    >
      <div className="aspect-square bg-gray-800 overflow-hidden">
        {listing.image && !imgError ? (
          <img
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[11px] text-gray-400 leading-snug line-clamp-2 mb-1.5 group-hover:text-gray-300 transition-colors">
          {listing.title}
        </p>
        <p className="text-sm font-bold text-amber-400 tabular-nums mb-2.5">
          ${listing.price.toFixed(2)}
        </p>
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
        >
          <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] font-semibold text-amber-400 tracking-wide">Add to Collection</span>
        </button>
      </div>
    </a>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

function GroupSection({ group }) {
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(group.query)}`;

  return (
    <section>
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="text-sm font-semibold text-gray-300">{group.title}</h2>
        <a
          href={ebayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-amber-500/60 hover:text-amber-400 active:text-amber-300 transition-colors"
        >
          See more →
        </a>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {group.listings.map((listing, i) => (
          <ListingCard key={i} listing={listing} />
        ))}
      </div>
    </section>
  );
}

// ─── Empty / error states ─────────────────────────────────────────────────────

function EmptyCollection() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="mb-5 opacity-50">
        <TagIcon size={52} />
      </div>
      <p className="text-gray-300 font-semibold text-sm mb-1.5">No finds today — check back soon</p>
      <p className="text-gray-600 text-xs leading-relaxed max-w-xs">
        Add shirts to your collection and we'll surface similar vintage pieces from eBay.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <p className="text-gray-500 text-sm mb-3">Couldn't load recommendations</p>
      <p className="text-gray-700 text-xs mb-5 font-mono">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-semibold text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Discover() {
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: shirts, error: dbError } = await supabase
        .from('shirts')
        .select('brand, style, era, year, current_est_value');

      if (dbError) throw new Error(dbError.message);
      if (!shirts?.length) { setGroups([]); return; }

      const result = await discoverListings(shirts);
      setGroups(result?.groups ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-8 pb-24">
      <div className="px-4 sm:px-6 pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Discover</h1>
          <p className="text-xs text-gray-500 mt-1">Curated vintage picks based on your collection</p>
        </div>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <DiscoverSkeleton />
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!groups.length) return <EmptyCollection />;

  return (
    <div className="space-y-8 pb-24">
      <div className="px-4 sm:px-6 pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Discover</h1>
          <p className="text-xs text-gray-500 mt-1">Curated vintage picks based on your collection</p>
        </div>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      {groups.map((group) => (
        <GroupSection key={group.id} group={group} />
      ))}
    </div>
  );
}
